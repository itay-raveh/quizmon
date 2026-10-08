import * as Sentry from '@sentry/node';
import {
  MongoOperationTimeoutError,
  MongoServerError,
  type Collection,
  type Db,
} from 'mongodb';
import type { TrainerProfile } from '../src/domain/player/trainer-profile.ts';
import { createTrainerProjector } from './trainer-projection.ts';
import {
  getDailyStreak,
  type TrainerStats,
} from '../src/domain/player/progress.ts';
import { getUtcDate } from '../src/domain/quiz/daily.ts';
import catalog from '../src/domain/pokemon/data/pokemon-generations.json' with { type: 'json' };

export interface CachedTrainer {
  _id: string;
  profile: TrainerProfile;
  leagueCompleted: boolean;
  detail?: {
    stats: TrainerStats;
    pokedex: string[];
    creditedDates: string[];
  };
}

class TrainerSourceChanged extends Error {}

export async function startTrainerSummaries(
  facts: Db,
  cache: Collection<CachedTrainer>,
  projector = createTrainerProjector(),
) {
  let closed = false;
  const io = { timeoutMS: 1_000 };
  const barriers = facts.collection<{ _id: string }>(
    'trainer_summary_barriers',
  );
  const openChanges = () =>
    facts.watch(
      [
        {
          $match: {
            $or: [
              { 'ns.coll': { $in: ['players', 'rounds'] } },
              {
                'ns.coll': 'trainer_summary_barriers',
                operationType: 'insert',
              },
              {
                operationType: {
                  $in: ['dropDatabase', 'invalidate', 'rename'],
                },
              },
            ],
          },
        },
        {
          $project: {
            operationType: 1,
            ns: 1,
            'fullDocument.id': 1,
            'fullDocument.ownerId': 1,
            'fullDocument._id': 1,
            ownershipChanged: {
              $or: [
                {
                  $ne: [
                    { $type: '$updateDescription.updatedFields.ownerId' },
                    'missing',
                  ],
                },
                {
                  $ne: [
                    { $type: '$updateDescription.updatedFields.id' },
                    'missing',
                  ],
                },
                {
                  $in: [
                    'ownerId',
                    { $ifNull: ['$updateDescription.removedFields', []] },
                  ],
                },
                {
                  $in: [
                    'id',
                    { $ifNull: ['$updateDescription.removedFields', []] },
                  ],
                },
              ],
            },
          },
        },
      ],
      {
        ...io,
        fullDocument: 'updateLookup',
        maxAwaitTimeMS: 1,
        batchSize: 100,
      },
    );
  let changes = openChanges();
  let serial = 0;
  let publication = 0;
  let failed = false;
  let resetNeeded = false;
  let draining: Promise<void> | undefined;
  const active = new Map<
    string,
    { detail: boolean; promise: Promise<CachedTrainer>; invalidate(): void }
  >();

  const reset = async () => {
    await changes.close();
    changes = openChanges();
    await changes.tryNext();
    await barriers.deleteMany({}, io);
    await cache.deleteMany({}, io);
    for (const entry of active.values()) entry.invalidate();
    serial++;
    publication++;
    resetNeeded = false;
  };

  const settled = () => {
    if (closed)
      return Promise.reject(
        Object.assign(new Error('Trainer summaries are closed.'), {
          status: 503,
        }),
      );
    if (failed)
      return Promise.reject(
        new Error('Trainer summary change source is unavailable.'),
      );
    draining ??= (async () => {
      if (resetNeeded) await reset();
      const owners = new Set<string>();
      let clearAll = false;
      const marker = crypto.randomUUID();
      const deadline = performance.now() + 1_000;
      const checkDeadline = () => {
        if (performance.now() > deadline)
          throw new Error(
            'Trainer summary change source did not reach the read barrier.',
          );
      };
      await barriers.insertOne(
        { _id: marker },
        { ...io, writeConcern: { w: 'majority' } },
      );
      try {
        while (true) {
          checkDeadline();
          const event = await changes.tryNext();
          checkDeadline();
          if (!event) continue;
          if (
            'ns' in event &&
            'coll' in event.ns &&
            event.ns.coll === 'trainer_summary_barriers'
          ) {
            if (
              event.operationType === 'insert' &&
              event.fullDocument._id === marker
            )
              break;
            continue;
          }
          serial++;
          if (
            event.operationType !== 'insert' &&
            event.operationType !== 'update' &&
            event.operationType !== 'replace' &&
            event.operationType !== 'delete'
          )
            throw new TrainerSourceChanged(
              'Trainer summary change source was replaced.',
            );
          const document = 'fullDocument' in event ? event.fullDocument : null;
          const owner: unknown =
            event.ns.coll === 'players' ? document?.id : document?.ownerId;
          if (
            typeof owner === 'string' &&
            event.operationType !== 'replace' &&
            !('ownershipChanged' in event && event.ownershipChanged === true)
          ) {
            owners.add(owner);
            active.get(owner)?.invalidate();
          } else {
            // Deletes, replacements and reassignment lack a reliable previous owner.
            clearAll = true;
            for (const entry of active.values()) entry.invalidate();
          }
          if (owners.size >= 1000) {
            await cache.deleteMany({ _id: { $in: [...owners] } }, io);
            owners.clear();
          }
        }
        if (clearAll) await cache.deleteMany({}, io);
        else if (owners.size)
          await cache.deleteMany({ _id: { $in: [...owners] } }, io);
      } finally {
        await barriers.deleteOne({ _id: marker }, io);
      }
    })()
      .catch(async (error: unknown) => {
        if (error instanceof TrainerSourceChanged) {
          failed = true;
          throw error;
        }
        resetNeeded = true;
        if (
          error instanceof MongoServerError &&
          error.codeName === 'ChangeStreamHistoryLost'
        ) {
          try {
            await reset();
          } catch {
            // The next read must reset successfully before using cached results.
          }
        }
        throw Object.assign(
          new Error('Trainer summary freshness check failed.', {
            cause: error,
          }),
          { status: 503 },
        );
      })
      .finally(() => {
        draining = undefined;
      });
    return draining;
  };

  try {
    // Establish the stream first, so writes during startup cannot be missed.
    await changes.tryNext();
    await barriers.deleteMany({}, io);
    // Every process start discards derived cache only. No rules are tagged or retained.
    await cache.deleteMany({}, io);
    await projector.ready();
  } catch (error) {
    await changes.close();
    await projector.close();
    throw error;
  }

  const compute = (owner: string, detail: boolean) =>
    Sentry.startSpan(
      {
        name: detail ? 'trainer.summary.rebuild' : 'trainer.card.rebuild',
        op: 'function',
      },
      async () => {
        if (closed)
          throw Object.assign(new Error('Trainer summaries are closed.'), {
            status: 503,
          });
        const [player, documents] = await Sentry.startSpan(
          { name: 'trainer.summary.facts', op: 'function' },
          () =>
            Promise.all([
              facts.collection('players').findOne(
                { id: owner, _deleted: false },
                {
                  ...io,
                  projection: { profile: 1 },
                  readConcern: { level: 'majority' },
                },
              ),
              facts
                .collection('rounds')
                .find(
                  {
                    ownerId: owner,
                    _deleted: false,
                    ...(detail ? {} : { mode: 'league' }),
                  },
                  {
                    ...io,
                    projection: {
                      _id: 0,
                      id: 1,
                      mode: 1,
                      completedAt: 1,
                      answers: 1,
                      training: 1,
                      day: 1,
                    },
                    readConcern: { level: 'majority' },
                  },
                )
                .toArray(),
            ]),
        );
        const value = await Sentry.startSpan(
          { name: 'trainer.summary.project', op: 'function' },
          () =>
            projector.run({
              profile: player ? (player.profile ?? null) : undefined,
              rounds: documents,
              detail,
            }),
        );
        Sentry.getActiveSpan()?.setAttributes({
          'trainer.round_count': value.roundCount,
          'trainer.worker.dispatch_ms': value.dispatchMs,
          'trainer.worker.validation_ms': value.validationMs,
          'trainer.worker.projection_ms': value.projectionMs,
          'trainer.worker.heap_bytes': value.heapBytes,
        });
        return {
          _id: owner,
          profile: value.profile,
          leagueCompleted: value.leagueCompleted,
          ...(value.detail ? { detail: value.detail } : {}),
        } satisfies CachedTrainer;
      },
    );

  // Reuse one CPU worker; bound both loaded histories and waiting cold work.
  let building = Promise.resolve();
  let admitted = 0;
  const rebuild = (owner: string, detail: boolean) => {
    if (admitted >= 2)
      return Promise.reject(
        Object.assign(new Error('Trainer summary rebuild is busy.'), {
          status: 503,
          retryAfter: '1',
        }),
      );
    admitted++;
    const task = Sentry.startSpan(
      { name: 'trainer.summary.wait', op: 'queue.wait' },
      () => building,
    )
      .then(() => compute(owner, detail))
      .finally(() => {
        admitted--;
      });
    building = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  };

  const get = (owner: string, detail: boolean): Promise<CachedTrainer> => {
    if (closed)
      return Promise.reject(
        Object.assign(new Error('Trainer summaries are closed.'), {
          status: 503,
        }),
      );
    const pending = active.get(owner);
    if (pending) {
      Sentry.getActiveSpan()?.setAttribute('trainer.summary.coalesced', true);
      return detail && !pending.detail
        ? pending.promise.then(() => get(owner, true))
        : pending.promise;
    }
    let invalidated = false;
    let published = false;
    const promise = (async () => {
      if (failed)
        throw new Error('Trainer summary change source is unavailable.');
      for (let attempt = 0; attempt < 3; attempt++) {
        await settled();
        invalidated = false;
        let value = await cache.findOne({ _id: owner }, io);
        let rebuilt = false;
        if (attempt === 0)
          Sentry.getActiveSpan()?.setAttribute(
            'trainer.summary.cache_hit',
            Boolean(value && (!detail || value.detail)),
          );
        if (!value || (detail && !value.detail)) {
          value = await rebuild(owner, detail);
          rebuilt = true;
          published = true;
          await cache.updateOne(
            { _id: owner },
            { $set: value },
            { ...io, upsert: true },
          );
          publication++;
        }
        // A warm read is current at its first barrier. Only publication needs another fence.
        if (rebuilt) await settled();
        if (!invalidated) return value;
        if (rebuilt) {
          // Another reader may have invalidated this owner before our write completed.
          await cache.deleteOne({ _id: owner }, io);
          publication++;
        }
      }
      throw new Error('Trainer facts changed repeatedly during the read.');
    })()
      .catch(async (error: unknown) => {
        // A failed freshness check must not leave a publication available to another reader.
        if (published) {
          try {
            await cache.deleteOne({ _id: owner }, io);
            publication++;
          } catch {
            resetNeeded = true;
          }
        }
        if (error instanceof MongoOperationTimeoutError)
          throw Object.assign(
            new Error('Trainer summary database read timed out.', {
              cause: error,
            }),
            { status: 503 },
          );
        throw error;
      })
      .finally(() => {
        active.delete(owner);
      });
    active.set(owner, {
      detail,
      promise,
      invalidate: () => {
        invalidated = true;
      },
    });
    return promise;
  };

  return {
    settled,
    healthy: () => !failed && !closed,
    async trainer(owner: string) {
      const value = await get(owner, true);
      if (!value.detail) throw new Error('Trainer summary is incomplete.');
      return {
        player: {
          id: owner,
          name: value.profile.name.trim() || 'Trainer',
          partnerPokemon: value.profile.partnerPokemon,
          leagueCompleted: value.leagueCompleted,
        },
        profile: value.profile,
        stats: value.detail.stats,
        pokedex: value.detail.pokedex,
        record: {
          dayCombo: getDailyStreak(value.detail.creditedDates, getUtcDate()),
          pokedexFound: value.detail.pokedex.length,
          pokedexTotal: Object.keys(catalog).length,
        },
      };
    },
    async players(ids: string[]) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await settled();
        const before = serial;
        const beforePublication = publication;
        const saved = await cache
          .find({ _id: { $in: ids } }, { ...io, projection: { detail: 0 } })
          .toArray();
        const values = new Map(saved.map((value) => [value._id, value]));
        const missing = ids.filter((id) => !values.has(id) || active.has(id));
        // Bound cold-card work; cards replay League facts only, never full histories.
        for (let index = 0; index < missing.length; index += 2) {
          const batch = await Promise.all(
            missing.slice(index, index + 2).map((id) => get(id, false)),
          );
          for (const value of batch) values.set(value._id, value);
        }
        if (missing.length) await settled();
        if (before === serial && beforePublication === publication)
          return ids.map((id) => {
            const value = values.get(id)!;
            return {
              id,
              profile: value.profile,
              leagueCompleted: value.leagueCompleted,
            };
          });
      }
      throw new Error('Trainer facts changed repeatedly during the read.');
    },
    async close() {
      closed = true;
      await projector.close();
      await building;
      await Promise.allSettled(
        [...active.values()].map((entry) => entry.promise),
      );
      await changes.close();
    },
  };
}

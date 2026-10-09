import * as Sentry from '@sentry/node';
import { MongoOperationTimeoutError, type Collection, type Db } from 'mongodb';
import type { TrainerSummaryWrites } from './trainer-summary-writes.ts';
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

export async function startTrainerSummaries(
  facts: Db,
  cache: Collection<CachedTrainer>,
  writes: TrainerSummaryWrites,
  projector = createTrainerProjector(),
) {
  let closed = false;
  const io = { timeoutMS: 1_000 };
  const active = new Map<
    string,
    { detail: boolean; promise: Promise<CachedTrainer> }
  >();
  const settled = async () => {
    if (closed)
      throw Object.assign(new Error('Trainer summaries are closed.'), {
        status: 503,
      });
    await writes.settled();
  };
  try {
    // Clear derived values under current code/rules before the origin can serve requests.
    await cache.deleteMany({}, io);
    await projector.ready();
  } catch (error) {
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
    const promise = (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const generations = await writes.snapshot([owner]);
        let value = await cache.findOne({ _id: owner }, io);
        if (attempt === 0)
          Sentry.getActiveSpan()?.setAttribute(
            'trainer.summary.cache_hit',
            Boolean(value && (!detail || value.detail)),
          );
        if (!writes.current([owner], generations)) continue;
        if (!value || (detail && !value.detail)) {
          value = await rebuild(owner, detail);
          if (!(await writes.publish(owner, generations[0]!, value))) continue;
        }
        if (writes.current([owner], generations)) return value;
      }
      throw Object.assign(
        new Error('Trainer facts changed repeatedly during the read.'),
        { status: 503, retryAfter: '1' },
      );
    })()
      .catch((error: unknown) => {
        if (error instanceof MongoOperationTimeoutError)
          throw Object.assign(
            new Error('Trainer summary database read timed out.', {
              cause: error,
            }),
            { status: 503, retryAfter: '1' },
          );
        throw error;
      })
      .finally(() => {
        active.delete(owner);
      });
    active.set(owner, { detail, promise });
    return promise;
  };

  return {
    settled,
    healthy: () => writes.healthy() && !closed,
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
      if (closed)
        throw Object.assign(new Error('Trainer summaries are closed.'), {
          status: 503,
        });
      for (let attempt = 0; attempt < 3; attempt++) {
        const generations = await writes.snapshot(ids);
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
        if (writes.current(ids, generations))
          return ids.map((id) => {
            const value = values.get(id)!;
            return {
              id,
              profile: value.profile,
              leagueCompleted: value.leagueCompleted,
            };
          });
      }
      throw Object.assign(
        new Error('Trainer facts changed repeatedly during the read.'),
        { status: 503, retryAfter: '1' },
      );
    },
    async close() {
      closed = true;
      await projector.close();
      await building;
      await Promise.allSettled(
        [...active.values()].map((entry) => entry.promise),
      );
    },
  };
}

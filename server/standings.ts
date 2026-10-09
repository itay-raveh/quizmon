import type { Collection } from 'mongodb';
import * as Sentry from '@sentry/node';
import type { MangoQuery, RxCollection } from 'rxdb';
import type { PlayerDatabase } from '../src/lib/storage/rxdb-database.ts';
import type { CompactRound } from '../src/domain/sync/compact-rounds.ts';
import {
  compactRoundSchema,
  scoreCompactRound,
} from '../src/domain/sync/compact-rounds.ts';

export interface Standing {
  _id: string;
  mode: 'daily' | 'training';
  ownerId: string;
  day?: string;
  roundId: string;
  completedAt: string;
  score: number;
  elapsedMilliseconds: number;
}

const standingFromRound = (round: CompactRound, ownerId: string): Standing => {
  const result = scoreCompactRound(round);
  return {
    _id:
      round.mode === 'daily'
        ? `daily/${ownerId}/${round.day}`
        : `training/${ownerId}`,
    mode: round.mode === 'daily' ? 'daily' : 'training',
    ownerId,
    ...(round.mode === 'daily' ? { day: round.day } : {}),
    roundId: round.id,
    completedAt: round.completedAt,
    score: result.score,
    elapsedMilliseconds: result.elapsedMilliseconds ?? 0,
  };
};

const isBetter = (candidate: Standing, previous: Standing) =>
  candidate.score > previous.score ||
  (candidate.score === previous.score &&
    (candidate.elapsedMilliseconds < previous.elapsedMilliseconds ||
      (candidate.elapsedMilliseconds === previous.elapsedMilliseconds &&
        (candidate.completedAt < previous.completedAt ||
          (candidate.completedAt === previous.completedAt &&
            candidate.roundId < previous.roundId)))));

const isEarlier = (candidate: Standing, previous: Standing) =>
  candidate.completedAt < previous.completedAt ||
  (candidate.completedAt === previous.completedAt &&
    candidate.roundId < previous.roundId);

async function* documents<T extends { id: string }>(
  collection: RxCollection<T>,
): AsyncGenerator<T> {
  let after = '';
  while (true) {
    const batch = await collection
      .find({
        selector: { id: { $gt: after } },
        sort: [{ id: 'asc' }],
        limit: 500,
      } as MangoQuery<T>)
      .exec();
    if (!batch.length) return;
    for (const doc of batch) yield doc.toMutableJSON();
    after = batch.at(-1)!.id;
  }
}

export async function startStandings(
  db: PlayerDatabase,
  collection: Collection<Standing>,
) {
  await collection.createIndex({
    mode: 1,
    day: 1,
    score: -1,
    elapsedMilliseconds: 1,
    completedAt: 1,
    roundId: 1,
    ownerId: 1,
  });
  await collection.createIndex({
    mode: 1,
    score: -1,
    elapsedMilliseconds: 1,
    completedAt: 1,
    roundId: 1,
    ownerId: 1,
  });
  // ponytail: one RxServer owns this rebuild. Add a lease before running replicas.
  await collection.deleteMany({});
  const bestTraining = new Map<string, Standing>();
  const firstDaily = new Map<string, Standing>();
  for await (const value of documents(db.rounds)) {
    const round = compactRoundSchema.safeParse(value);
    if (!round.success || round.data.mode === 'league') continue;
    const ownerId = value.ownerId;
    const candidate = standingFromRound(round.data, ownerId);
    if (round.data.mode === 'training') {
      const previous = bestTraining.get(ownerId);
      if (!previous || isBetter(candidate, previous))
        bestTraining.set(ownerId, candidate);
    } else {
      const previous = firstDaily.get(candidate._id);
      if (!previous || isEarlier(candidate, previous))
        firstDaily.set(candidate._id, candidate);
    }
  }
  const initial = [...bestTraining.values(), ...firstDaily.values()];
  if (initial.length) await collection.insertMany(initial);

  let pending = Promise.resolve();
  let failure: unknown;
  const enqueue = (work: () => Promise<void>) => {
    pending = pending.then(work).catch((error: unknown) => {
      failure = error;
    });
  };
  const rounds = db.rounds.$.subscribe((event) => {
    if (event.operation !== 'INSERT') return;
    enqueue(async () => {
      const round = compactRoundSchema.safeParse(event.documentData);
      if (!round.success) return;
      const ownerId = event.documentData.ownerId;
      if (round.data.mode === 'training') {
        const candidate = standingFromRound(round.data, ownerId);
        const previous = await collection.findOne({ _id: candidate._id });
        if (!previous || isBetter(candidate, previous))
          await collection.replaceOne({ _id: candidate._id }, candidate, {
            upsert: true,
          });
      } else if (round.data.mode === 'daily') {
        const candidate = standingFromRound(round.data, ownerId);
        const previous = await collection.findOne({ _id: candidate._id });
        if (!previous || isEarlier(candidate, previous))
          await collection.replaceOne({ _id: candidate._id }, candidate, {
            upsert: true,
          });
      }
    });
  });

  return {
    collection,
    async settled() {
      await pending;
      if (failure)
        throw failure instanceof Error
          ? failure
          : new Error('Standings update failed.', { cause: failure });
    },
    healthy: () => !failure,
    async removeOwner(ownerId: string) {
      await this.settled();
      await collection.deleteMany({ ownerId });
    },
    close() {
      rounds.unsubscribe();
    },
  };
}

export async function boardRows(
  store: Awaited<ReturnType<typeof startStandings>>,
  mode: 'daily' | 'training',
  visible: string[] | null,
  day?: string,
) {
  await Sentry.startSpan({ name: 'standings.wait', op: 'queue.wait' }, () =>
    store.settled(),
  );
  if (mode === 'daily' && !day) return [];
  const rows = await store.collection
    .find({
      mode,
      ...(mode === 'daily' ? { day } : {}),
      ...(visible ? { ownerId: { $in: visible } } : {}),
    })
    .sort({
      score: -1,
      elapsedMilliseconds: 1,
      completedAt: 1,
      roundId: 1,
      ownerId: 1,
    })
    .toArray();
  let rank = 0;
  return rows.map((row, index) => {
    const previous = rows[index - 1];
    if (
      !previous ||
      previous.score !== row.score ||
      previous.elapsedMilliseconds !== row.elapsedMilliseconds
    )
      rank = index + 1;
    return {
      playerId: row.ownerId,
      roundId: row.roundId,
      completedAt: row.completedAt,
      score: row.score,
      elapsedMilliseconds: row.elapsedMilliseconds,
      comparable: true,
      rank,
      ordinal: index + 1,
    };
  });
}

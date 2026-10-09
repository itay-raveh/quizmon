import assert from 'node:assert/strict';
import { MongoClient, type Collection } from 'mongodb';
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import {
  compactCompletion,
  compactRoundSchema,
  scoreCompactRound,
} from '../../src/domain/sync/compact-rounds.ts';
import { openPlayerDatabase } from '../../src/lib/storage/rxdb-database.ts';
import {
  boardPage,
  startStandings,
  type Standing,
} from '../../server/standings.ts';
import { completion } from './progress-fixtures.ts';
import { roundSchema } from '../../src/lib/storage/rxdb-schema.ts';
import { testMongoUrl } from './account-fixture.ts';

const name = `quizmon_standings_${crypto.randomUUID().replaceAll('-', '')}`;
const url = testMongoUrl(name);
const mongo = await new MongoClient(url, { monitorCommands: true }).connect();
const collection: Collection<Standing> = mongo
  .db(`${name}_app`)
  .collection<Standing>('standings');
let db: Awaited<ReturnType<typeof openPlayerDatabase>> | undefined;
let standings: Awaited<ReturnType<typeof startStandings>> | undefined;
const rows = async (
  store: Awaited<ReturnType<typeof startStandings>>,
  mode: 'daily' | 'training',
  visible: string[] | null,
  day?: string,
) => (await boardPage(store, mode, visible, 'alpha', 0, 100, day)).page;
try {
  db = await openPlayerDatabase(
    name,
    getRxStorageMongoDB({ connection: url }),
    false,
  );
  const first = compactCompletion(completion('training'));
  assert(first.mode === 'training');
  const older = compactRoundSchema.parse({
    ...first,
    id: crypto.randomUUID(),
    training: {
      level: first.training.level,
      generations: first.training.generations,
      formGroups: first.training.formGroups,
    },
    answers: first.answers.map((answer, index) => ({
      ...answer,
      responseMs: index === 0 ? 0 : answer.responseMs,
    })),
  });
  const daily = compactCompletion(completion('daily'));
  assert(daily.mode === 'daily');
  await db.rounds.insert({ ...first, ownerId: 'alpha' });
  await db.rounds.insert({ ...older, ownerId: 'legacy' });
  await db.rounds.insert({ ...daily, ownerId: 'alpha' });
  await collection.insertOne({
    _id: 'training/legacy',
    mode: 'training',
    ownerId: 'legacy',
    roundId: older.id,
    completedAt: older.completedAt,
    score: 1,
    elapsedMilliseconds: 0,
  });
  standings = await startStandings(db, collection);
  assert.equal((await rows(standings, 'training', null))[0]?.roundId, older.id);
  assert.equal(
    (await rows(standings, 'training', null)).find(
      (row) => row.playerId === 'legacy',
    )?.score,
    scoreCompactRound(older).score,
  );
  assert.equal(
    (await rows(standings, 'daily', null, daily.day))[0]?.roundId,
    daily.id,
  );

  const faster = compactCompletion(completion('training'));
  faster.answers[0]!.responseMs = 0;
  faster.answers[1]!.responseMs = 0;
  await db.rounds.insert({ ...faster, ownerId: 'alpha' });
  assert.equal(
    (await rows(standings, 'training', null))[0]?.roundId,
    faster.id,
  );
  assert(
    (await rows(standings, 'training', null)).some(
      (row) => row.playerId === 'legacy',
    ),
  );
  assert.ok(scoreCompactRound(faster).score > scoreCompactRound(first).score);

  const later = compactCompletion(
    completion('daily', { completedAt: '2026-09-11T11:00:00.000Z' }),
  );
  assert(later.mode === 'daily');
  later.answers[0]!.responseMs = 0;
  await db.rounds.insert({ ...later, ownerId: 'alpha' });
  assert.equal(
    (await rows(standings, 'daily', null, daily.day))[0]?.roundId,
    daily.id,
  );
  assert.ok(scoreCompactRound(later).score > scoreCompactRound(daily).score);

  const earlier = compactCompletion(
    completion('daily', { completedAt: '2026-09-11T09:00:00.000Z' }),
  );
  await db.rounds.insert({ ...earlier, ownerId: 'alpha' });
  assert.equal(
    (await rows(standings, 'daily', null, daily.day))[0]?.roundId,
    earlier.id,
  );

  standings.close();
  await db.close();
  db = await openPlayerDatabase(
    name,
    getRxStorageMongoDB({ connection: url }),
    false,
  );
  standings = await startStandings(db, collection);
  assert.equal(
    (await rows(standings, 'training', null))[0]?.roundId,
    faster.id,
  );
  assert.equal(
    (await rows(standings, 'daily', null, daily.day))[0]?.roundId,
    earlier.id,
  );

  standings.close();
  await standings.settled();
  await collection.deleteMany({});
  const fixtures: Standing[] = Array.from({ length: 2_000 }, (_, index) => ({
    _id: `training/ranked-${String(index).padStart(5, '0')}`,
    mode: 'training',
    ownerId: `ranked-${String(index).padStart(5, '0')}`,
    roundId: String(index).padStart(5, '0'),
    completedAt: `2026-09-11T0${index % 3}:00:00.000Z`,
    score: Math.floor((2_000 - index) / 20),
    elapsedMilliseconds: Math.floor((index % 20) / 5) * 100,
  }));
  await collection.insertMany([
    ...fixtures,
    { ...fixtures[0]!, _id: 'daily/first', mode: 'daily', day: daily.day },
    { ...fixtures[1]!, _id: 'daily/other', mode: 'daily', day: '2026-09-10' },
  ]);
  const reference = (visible: string[] | null, values = fixtures) => {
    const sorted = values
      .filter((row) => !visible || visible.includes(row.ownerId))
      .sort((a, b) => {
        const numeric =
          b.score - a.score || a.elapsedMilliseconds - b.elapsedMilliseconds;
        if (numeric) return numeric;
        for (const field of ['completedAt', 'roundId', 'ownerId'] as const) {
          if (a[field] !== b[field]) return a[field] < b[field] ? -1 : 1;
        }
        return 0;
      });
    let rank = 0;
    return sorted.map((row, index) => {
      const previous = sorted[index - 1];
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
  };
  const viewer = fixtures[1_050]!.ownerId;
  let returned = 0;
  mongo.on('commandSucceeded', (event) => {
    if (!['find', 'getMore'].includes(event.commandName)) return;
    const { cursor } = event.reply as {
      cursor?: { ns?: string; firstBatch?: unknown[]; nextBatch?: unknown[] };
    };
    if (cursor?.ns === `${name}_app.standings`)
      returned += (cursor.firstBatch ?? cursor.nextBatch ?? []).length;
  });
  const all = reference(null);
  for (const offset of [0, 3, 1_997, 2_001]) {
    const actual = await boardPage(
      standings,
      'training',
      null,
      viewer,
      offset,
      5,
    );
    assert.deepEqual(actual, {
      total: all.length,
      page: all.slice(offset, offset + 5),
      viewer: all.find((row) => row.playerId === viewer) ?? null,
    });
  }
  const visible = fixtures
    .filter((_, index) => index % 100 === 0)
    .map((row) => row.ownerId);
  const friends = reference(visible);
  const onPage = await boardPage(
    standings,
    'training',
    null,
    all[3]!.playerId,
    3,
    5,
  );
  assert.deepEqual(onPage.viewer, all[3]);
  assert.deepEqual(await boardPage(standings, 'training', [], viewer, 0, 5), {
    total: 0,
    page: [],
    viewer: null,
  });
  assert.deepEqual(
    await boardPage(standings, 'training', visible, viewer, 2, 7),
    {
      total: friends.length,
      page: friends.slice(2, 9),
      viewer: null,
    },
  );
  assert.equal(
    (await boardPage(standings, 'daily', null, viewer, 0, 5, daily.day)).total,
    1,
  );
  assert.deepEqual(await boardPage(standings, 'daily', null, viewer, 0, 5), {
    total: 0,
    page: [],
    viewer: null,
  });
  returned = 0;
  const before = performance.now();
  await collection
    .find({ mode: 'training' })
    .sort({
      score: -1,
      elapsedMilliseconds: 1,
      completedAt: 1,
      roundId: 1,
      ownerId: 1,
    })
    .toArray();
  const baselineMs = performance.now() - before;
  const baselineReturned = returned;
  returned = 0;
  const started = performance.now();
  await boardPage(standings, 'training', null, viewer, 0, 50);
  const boundedMs = performance.now() - started;
  assert.equal(baselineReturned, fixtures.length);
  assert.equal(returned, 51);
  console.log(
    `Isolated 2000-row comparison: baseline ${baselineReturned} documents/${baselineMs.toFixed(1)}ms; bounded ${returned} documents/${boundedMs.toFixed(1)}ms (one request each, not production timings).`,
  );

  // Pause after a real read has pinned its snapshot, then commit independent writes.
  const writer = await new MongoClient(url).connect();
  const written = writer.db(`${name}_app`).collection<Standing>('standings');
  const counted = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const countDocuments = collection.countDocuments.bind(collection);
  let pauseNext = true;
  collection.countDocuments = async (
    ...args: Parameters<typeof collection.countDocuments>
  ) => {
    const count = await countDocuments(...args);
    if (pauseNext) {
      pauseNext = false;
      counted.resolve();
      await release.promise;
    }
    return count;
  };
  const pending = boardPage(standings, 'training', null, viewer, 3, 5);
  try {
    await Promise.race([
      counted.promise,
      pending.then(() => {
        throw new Error('The snapshot reader completed before its write gate.');
      }),
    ]);
    await writer.withSession((session) =>
      session.withTransaction(
        async () => {
          await written.deleteOne({ _id: fixtures[0]!._id }, { session });
          await written.insertMany(
            ['concurrent-a', 'concurrent-b'].map((ownerId) => ({
              ...fixtures[0]!,
              _id: `training/${ownerId}`,
              ownerId,
              roundId: ownerId,
              score: fixtures[0]!.score + 1,
            })),
            { session },
          );
          await written.updateOne(
            { ownerId: all[3]!.playerId, mode: 'training' },
            { $set: { score: fixtures[0]!.score + 3 } },
            { session },
          );
          await written.updateOne(
            { ownerId: viewer, mode: 'training' },
            { $set: { score: fixtures[0]!.score + 2 } },
            { session },
          );
        },
        { writeConcern: { w: 'majority' } },
      ),
    );
    release.resolve();
    assert.deepEqual(await pending, {
      total: all.length,
      page: all.slice(3, 8),
      viewer: all.find((row) => row.playerId === viewer) ?? null,
    });
    const after = reference(
      null,
      await written.find({ mode: 'training' }).toArray(),
    );
    assert.deepEqual(
      await boardPage(standings, 'training', null, viewer, 3, 5),
      {
        total: after.length,
        page: after.slice(3, 8),
        viewer: after.find((row) => row.playerId === viewer) ?? null,
      },
    );
    console.log(
      'Snapshot totals, page, viewer and ranks stayed consistent across committed concurrent inserts, updates and deletion; the next request observed the changes.',
    );
  } finally {
    release.resolve();
    collection.countDocuments = countDocuments;
    await pending.catch(() => undefined);
    await writer.close();
  }
  console.log('Standings update and rebuild passed.');
} finally {
  standings?.close();
  await db?.close();
  for (const version of new Set([0, roundSchema.version]))
    await mongo.db(`${name}-v${version}`).dropDatabase();
  await mongo.db(`${name}_app`).dropDatabase();
  await mongo.close();
}

import assert from 'node:assert/strict';
import { MongoClient, type Collection } from 'mongodb';
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import {
  compactCompletion,
  scoreCompactRound,
} from '../../src/domain/sync/compact-rounds.ts';
import { openPlayerDatabase } from '../../src/lib/storage/rxdb-database.ts';
import { dailyReceiptId } from '../../src/lib/storage/rxdb-schema.ts';
import {
  boardRows,
  startStandings,
  type Standing,
} from '../../server/standings.ts';
import { completion } from './progress-fixtures.ts';

const name = `quizmon_standings_${crypto.randomUUID().replaceAll('-', '')}`;
const url = `mongodb://127.0.0.1:27018/${name}?directConnection=true`;
const mongo = await new MongoClient(url).connect();
const collection: Collection<Standing> = mongo
  .db(`${name}_app`)
  .collection<Standing>('standings');
let db: Awaited<ReturnType<typeof openPlayerDatabase>> | undefined;
let standings: Awaited<ReturnType<typeof startStandings>> | undefined;
try {
  db = await openPlayerDatabase(
    name,
    getRxStorageMongoDB({ connection: url }),
    false,
  );
  const first = compactCompletion(completion('training'));
  const daily = compactCompletion(completion('daily'));
  assert(daily.mode === 'daily');
  await db.rounds.insert({ ...first, ownerId: 'alpha' });
  await db.rounds.insert({ ...daily, ownerId: 'alpha' });
  await db.dailyReceipts.insert({
    id: dailyReceiptId('alpha', daily.day),
    ownerId: 'alpha',
    day: daily.day,
    roundId: daily.id,
  });
  standings = await startStandings(db, collection);
  assert.equal(
    (await boardRows(standings, 'training', null))[0]?.roundId,
    first.id,
  );
  assert.equal(
    (await boardRows(standings, 'daily', null, daily.day))[0]?.roundId,
    daily.id,
  );

  const faster = compactCompletion(completion('training'));
  faster.answers[0]!.responseMs = 0;
  await db.rounds.insert({ ...faster, ownerId: 'alpha' });
  assert.equal(
    (await boardRows(standings, 'training', null))[0]?.roundId,
    faster.id,
  );
  assert.ok(scoreCompactRound(faster).score > scoreCompactRound(first).score);

  const rejected = compactCompletion(completion('daily'));
  assert(rejected.mode === 'daily');
  rejected.answers[0]!.responseMs = 0;
  await db.rounds.insert({ ...rejected, ownerId: 'alpha' });
  assert.equal(
    (await boardRows(standings, 'daily', null, daily.day))[0]?.roundId,
    daily.id,
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
    (await boardRows(standings, 'training', null))[0]?.roundId,
    faster.id,
  );
  assert.equal(
    (await boardRows(standings, 'daily', null, daily.day))[0]?.roundId,
    daily.id,
  );
  console.log('Standings update and rebuild passed.');
} finally {
  standings?.close();
  await db?.close();
  await mongo.db(`${name}-v0`).dropDatabase();
  await mongo.db(`${name}_app`).dropDatabase();
  await mongo.close();
}

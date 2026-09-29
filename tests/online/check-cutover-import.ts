import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import { openPlayerDatabase } from '../../src/lib/storage/rxdb-database.ts';
import { createTrainerProfile } from '../../src/domain/player/trainer-profile.ts';

const run = promisify(execFile);
const suffix = crypto.randomUUID().replaceAll('-', '');
const sourceName = `cutover_source_${suffix}`;
const targetName = `cutover_target_${suffix}`;
const mongoUrl = 'mongodb://127.0.0.1:27018/quizmon?directConnection=true';
const client = await new MongoClient(mongoUrl).connect();
try {
  const source = client.db(sourceName);
  const id = crypto.randomUUID();
  await source.collection('players').insertOne({
    _deleted: false,
    id: 'trainer',
    ownerId: 'trainer',
    profile: {
      ...createTrainerProfile(),
      createdAt: '2026-09-29',
      hasBeenRevealed: true,
    },
    settings: null,
  });
  await source.collection('rounds').insertOne({
    _deleted: false,
    id,
    ownerId: 'trainer',
    fact: {
      id,
      mode: 'daily',
      day: '2026-09-29',
      completed_at: '2026-09-29T12:00:00.000Z',
      credited: true,
      data: {
        config: {
          generations: ['I'],
          form_groups: ['standard'],
        },
        answers: Array.from({ length: 5 }, () => ({
          question_type: 'pokemonTypes',
          subject: { kind: 'pokemon', name: 'bulbasaur' },
          question: {
            interaction: 'search',
            options: ['grass', 'fire', 'water', 'electric'],
            expected: ['grass'],
            selected: ['grass'],
          },
          clues_used: 0,
          response_ms: 1000,
        })),
      },
    },
  });
  const command = fileURLToPath(
    new URL('../../server/cutover-import-progress.ts', import.meta.url),
  );
  const env = {
    ...process.env,
    CUTOVER_MONGO_URL: mongoUrl,
    CUTOVER_SOURCE_DB: sourceName,
    CUTOVER_TARGET_NAME: targetName,
  };
  const dry = await run(process.execPath, [command], { env });
  const report = JSON.parse(dry.stdout) as Record<string, unknown>;
  assert.equal(report.applied, false);
  assert.equal(report.players, 1);
  assert.equal(report.rounds, 1);
  const first = await run(process.execPath, [command, '--apply'], { env });
  const second = await run(process.execPath, [command, '--apply'], { env });
  assert.equal(first.stdout, second.stdout);
  const db = await openPlayerDatabase(
    targetName,
    getRxStorageMongoDB({ connection: mongoUrl }),
    false,
  );
  try {
    const player = await db.players.findOne('trainer').exec();
    const round = await db.rounds.findOne(id).exec();
    assert.ok(player && round);
    assert.equal(Object.hasOwn(player.profile, 'createdAt'), false);
    assert.equal(round.answers[0]?.options, undefined);
  } finally {
    await db.close();
  }
  console.log('Cutover progress dry run and idempotent import passed.');
} finally {
  await client.db(sourceName).dropDatabase();
  await client.db(`${targetName}-v0`).dropDatabase();
  await client.close();
}

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { exportAccount } from '../../server/account-export.ts';
import {
  targetSubmitRound,
  TargetProgressError,
} from '../../server/target-progress-api.ts';
import { archiveCompletion } from '../../src/domain/sync/round-facts.ts';
import { completion } from './progress-fixtures.ts';
import { testDatabase } from './account-fixture.ts';

const database = await testDatabase();
const restoredName = `quizmon_restore_${crypto.randomUUID().replaceAll('-', '')}`;
const restoredUrl = new URL(database.connectionString);
restoredUrl.pathname = `/${restoredName}`;
const owner = crypto.randomUUID();
const dataset = crypto.randomUUID();
try {
  await database.pool.query(
    'INSERT INTO "user"(id,name,email) VALUES ($1,$2,$3)',
    [owner, 'Restore test', 'restore@example.test'],
  );
  await database.pool.query('INSERT INTO player(id,code) VALUES ($1,$2)', [
    owner,
    'ABCD0123456789EF',
  ]);
  await database.pool.query(
    'INSERT INTO dataset(id,player_id) VALUES ($1,$2)',
    [dataset, owner],
  );
  const [instance] = (
    await database.pool.query<{ epoch: string }>(
      'SELECT epoch FROM instance WHERE id=1',
    )
  ).rows;
  const epoch = instance?.epoch ?? crypto.randomUUID();
  await database.pool.query(
    'INSERT INTO instance(id,epoch) VALUES (1,$1) ON CONFLICT (id) DO UPDATE SET epoch=$1',
    [epoch],
  );
  const fact = archiveCompletion(completion(dataset));
  const { credited: _serverOnly, ...upload } = fact;
  void _serverOnly;
  await targetSubmitRound(
    drizzle(database.pool),
    owner,
    dataset,
    epoch,
    upload,
  );
  const before = (await (
    await exportAccount(
      database.connectionString,
      owner,
      new AbortController().signal,
    )
  ).json()) as Record<string, unknown>;
  const dump = execFileSync('docker', [
    'exec',
    database.container,
    'pg_dump',
    '--username=postgres',
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    'postgres',
  ]);
  await database.pool.query(`CREATE DATABASE ${restoredName}`);
  execFileSync(
    'docker',
    [
      'exec',
      '--interactive',
      database.container,
      'pg_restore',
      '--username=postgres',
      '--no-owner',
      '--no-privileges',
      '--dbname',
      restoredName,
    ],
    { input: dump },
  );
  const restored = new Pool({ connectionString: restoredUrl.toString() });
  try {
    const nextEpoch = crypto.randomUUID();
    await restored.query('UPDATE instance SET epoch=$1 WHERE id=1', [
      nextEpoch,
    ]);
    const newRound = archiveCompletion(completion(dataset));
    const { credited: _newServerOnly, ...newUpload } = newRound;
    void _newServerOnly;
    await assert.rejects(
      targetSubmitRound(drizzle(restored), owner, dataset, epoch, newUpload),
      (error: unknown) =>
        error instanceof TargetProgressError &&
        error.code === 'instance_changed',
    );
    await targetSubmitRound(
      drizzle(restored),
      owner,
      dataset,
      nextEpoch,
      newUpload,
    );
    const after = (await (
      await exportAccount(
        restoredUrl.toString(),
        owner,
        new AbortController().signal,
      )
    ).json()) as Record<string, unknown>;
    assert.deepEqual(after.account, before.account);
    assert.deepEqual(after.player, before.player);
    assert.equal(
      (after.rounds as unknown[]).length,
      (before.rounds as unknown[]).length + 1,
    );
    assert.notEqual(after.serverEpoch, before.serverEpoch);
    process.stdout.write(
      'database restore, export comparison, and stale epoch rejection passed\n',
    );
  } finally {
    await restored.end();
  }
} finally {
  await database.pool.query(
    `DROP DATABASE IF EXISTS ${restoredName} WITH (FORCE)`,
  );
  await database.close();
}

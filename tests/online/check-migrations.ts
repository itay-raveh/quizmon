import assert from 'node:assert/strict';
import { migrateDatabase } from '../../deploy/migration-runner.ts';
import { migrationsFolder, testDatabase } from './account-fixture.ts';

const database = await testDatabase();
try {
  const run = (connectionString = database.connectionString) =>
    migrateDatabase({ connectionString, migrationsFolder });
  assert.deepEqual(await run(), { applied: 0, total: 2 });
  const schema = await database.pool.query<{ name: string }>(
    "SELECT tablename AS name FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
  );
  for (const name of ['player', 'friend', 'mail_budget', 'user'])
    assert.ok(
      schema.rows.some((row) => row.name === name),
      name,
    );
  for (const name of [
    'account_state',
    'completion_facts',
    'player_pokemon',
    'test_mailbox',
    'round',
    'round_score',
    'dataset',
    'op',
    'instance',
  ])
    assert.ok(!schema.rows.some((row) => row.name === name), name);
  await database.pool
    .query(`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at)
    VALUES ('migration-check','Migration check','migration@example.test',true,now(),now())`);
  await database.pool.query(
    "INSERT INTO player(id,code) VALUES ('migration-check','ABCDEF0123456789')",
  );
  assert.deepEqual(await run(), { applied: 0, total: 2 });
  const kept = await database.pool.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM player',
  );
  assert.equal(kept.rows[0]?.count, '1');
  const [history] = (
    await database.pool.query<{ hash: string }>(
      'SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id LIMIT 1',
    )
  ).rows;
  await database.pool.query(
    "UPDATE drizzle.__drizzle_migrations SET hash='changed' WHERE id=1",
  );
  await assert.rejects(run(), /checksum differs/);
  await database.pool.query(
    'UPDATE drizzle.__drizzle_migrations SET hash=$1 WHERE id=1',
    [history!.hash],
  );
  process.stdout.write(
    'fresh migration, idempotence, and checksum guard passed\n',
  );
} finally {
  await database.close();
}

import assert from 'node:assert/strict';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';
import {
  assertAlphaWriteGate,
  setAlphaWriteGate,
} from '../../deploy/alpha-write-gate.ts';
import { migrateDatabase } from '../../deploy/migration-runner.ts';
import { migrationsFolder, testDatabase } from './account-fixture.ts';

const database = await testDatabase();
const oldName = `old_probe_${crypto.randomUUID().replaceAll('-', '')}`;
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
  await database.pool.query(`CREATE DATABASE ${oldName}`);
  const oldUrl = database.connectionString.replace(
    /\/postgres$/,
    `/${oldName}`,
  );
  const old = new Client({ connectionString: oldUrl });
  try {
    await old.connect();
    await old.query('CREATE TABLE account_state(id text PRIMARY KEY)');
    await assert.rejects(run(oldUrl), /old schema|fresh database/i);
  } finally {
    await old.end();
    await database.pool.query(`DROP DATABASE ${oldName}`);
  }
  process.stdout.write(
    'fresh migration, idempotence, checksum guard, and old-schema refusal passed\n',
  );
} finally {
  await database.close();
}

const oldFolder = await mkdtemp(join(tmpdir(), 'quizmon-migrations-'));
try {
  await mkdir(join(oldFolder, 'meta'));
  const journal = JSON.parse(
    await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
  ) as {
    entries: unknown[];
  };
  await writeFile(
    join(oldFolder, 'meta/_journal.json'),
    JSON.stringify({
      ...journal,
      entries: journal.entries.slice(0, 1),
    }),
  );
  await copyFile(
    join(migrationsFolder, '0000_initial.sql'),
    join(oldFolder, '0000_initial.sql'),
  );
  const legacy = await testDatabase(oldFolder);
  try {
    await legacy.pool
      .query(`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at)
      VALUES ('preserved','Preserved','preserved@example.test',true,now(),now())`);
    await legacy.pool.query(
      "INSERT INTO player(id,code) VALUES ('preserved','0123456789ABCDEF')",
    );
    await legacy.pool.query(
      'INSERT INTO round(id,player_id,mode,completed_at,credited,data) VALUES ($1,$2,$3,now(),true,$4)',
      [crypto.randomUUID(), 'preserved', 'training', {}],
    );
    const gateClient = new Client({
      connectionString: legacy.connectionString,
    });
    try {
      await gateClient.connect();
      await setAlphaWriteGate(gateClient, true);
      await assertAlphaWriteGate(gateClient);
      await assert.rejects(
        legacy.pool.query("UPDATE player SET name=name WHERE id='preserved'"),
        /progress writes are paused/,
      );
      await assert.rejects(
        legacy.pool.query(
          'INSERT INTO round(id,player_id,mode,completed_at,credited,data) VALUES ($1,$2,$3,now(),true,$4)',
          [crypto.randomUUID(), 'preserved', 'training', {}],
        ),
        /progress writes are paused/,
      );
      await setAlphaWriteGate(gateClient, false);
      await legacy.pool.query(
        "UPDATE player SET name=name WHERE id='preserved'",
      );
      await setAlphaWriteGate(gateClient, true);
    } finally {
      await gateClient.end();
    }
    assert.deepEqual(
      await migrateDatabase({
        connectionString: legacy.connectionString,
        migrationsFolder,
      }),
      { applied: 1, total: 2 },
    );
    const identity = await legacy.pool.query<{ code: string }>(
      "SELECT code FROM player WHERE id='preserved'",
    );
    assert.equal(identity.rows[0]?.code, '0123456789ABCDEF');
    await legacy.pool
      .query(`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at)
      VALUES ('after-cutover','After cutover','after-cutover@example.test',true,now(),now())`);
    await legacy.pool.query(
      "INSERT INTO player(id,code) VALUES ('after-cutover','ABCDEF0123456789')",
    );
    const removed = await legacy.pool.query<{ name: string | null }>(
      "SELECT to_regclass('public.round')::text AS name",
    );
    assert.equal(removed.rows[0]?.name, null);
  } finally {
    await legacy.close();
  }
} finally {
  await rm(oldFolder, { recursive: true, force: true });
}

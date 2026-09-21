import { Client } from 'pg';

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateDatabase } from '../../deploy/migration-runner.ts';
import {
  MigrationBusyError,
  releaseLockSql,
} from '../../deploy/release-lock.ts';

import assert from 'node:assert/strict';

const database = `quizmon_migration_${crypto.randomUUID().replaceAll('-', '')}`;
const admin = new Client({
  connectionString: 'postgresql://postgres:unused@127.0.0.1:5548/postgres',
});
await admin.connect();
let created = false;
const fixtureRoot = fileURLToPath(
  new URL('../../.wrangler/accounts/', import.meta.url),
);
await mkdir(fixtureRoot, { recursive: true });
const fixture = await mkdtemp(join(fixtureRoot, 'migration-check-'));
const migrationsFolder = fileURLToPath(
  new URL('../../server/migrations', import.meta.url),
);
const connectionString = `postgresql://postgres:unused@127.0.0.1:5548/${database}`;
const run = (folder = migrationsFolder) =>
  migrateDatabase({ connectionString, migrationsFolder: folder });
const client = new Client({
  connectionString: `postgresql://postgres:unused@127.0.0.1:5548/${database}`,
});
try {
  await admin.query(`CREATE DATABASE ${database}`);
  created = true;
  await client.connect();
  await cp(migrationsFolder, fixture, { recursive: true });
  const initialJournalPath = join(fixture, 'meta/_journal.json');
  const initialJournal = JSON.parse(
    await readFile(initialJournalPath, 'utf8'),
  ) as { entries: unknown[] };
  initialJournal.entries.length = 1;
  await writeFile(initialJournalPath, JSON.stringify(initialJournal));
  await rm(join(fixture, '0001_reset-baseline.sql'));
  await run(fixture);
  await client.query(
    `INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at) VALUES ('migration-check','Migration check','migration@example.test',true,now(),now())`,
  );
  await client.query(
    `INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at) VALUES ('migration-other','Migration other','other@example.test',true,now(),now())`,
  );
  await client.query(
    `INSERT INTO account_state (id,generation_id,progress) VALUES ('migration-check',$1,'{}')`,
    [crypto.randomUUID()],
  );
  await client.query(
    `INSERT INTO friend_requests (id,user_low,user_high,sender_id) VALUES ($1,'migration-check','migration-other','migration-check')`,
    [crypto.randomUUID()],
  );
  await client.query(
    `INSERT INTO verification (id,identifier,value,expires_at) VALUES ('migration-code','migration@example.test','secret',now() + interval '1 hour')`,
  );
  await client.query(
    `INSERT INTO test_mailbox (email,code) VALUES ('migration@example.test','secret')`,
  );
  assert.deepEqual(await run(), { applied: 1, total: 2 });
  for (const table of [
    'user',
    'account_state',
    'friend_requests',
    'verification',
    'test_mailbox',
  ])
    assert.equal(
      (
        await client.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM "${table}"`,
        )
      ).rows[0]!.count,
      0,
    );
  await client.query(
    `INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at) VALUES ('migration-check','Migration check','migration@example.test',true,now(),now())`,
  );
  await client.query(
    `INSERT INTO account_state (id,generation_id,progress) VALUES ('migration-check',$1,'{}')`,
    [crypto.randomUUID()],
  );
  assert.deepEqual(await run(), { applied: 0, total: 2 });
  assert.equal(
    (
      await client.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM account_state',
      )
    ).rows[0]!.count,
    1,
  );
  assert.equal(
    (
      await client.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations',
      )
    ).rows[0]!.count,
    2,
  );
  const competing = await Promise.allSettled(
    Array.from({ length: 6 }, () => run()),
  );
  assert.ok(competing.some((result) => result.status === 'fulfilled'));
  for (const result of competing)
    if (result.status === 'rejected')
      assert.ok(result.reason instanceof MigrationBusyError);

  await cp(migrationsFolder, fixture, { recursive: true });
  const journalPath = join(fixture, 'meta/_journal.json');
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as {
    entries: {
      idx: number;
      version: string;
      when: number;
      tag: string;
      breakpoints: boolean;
    }[];
  };
  journal.entries.push({
    idx: 2,
    version: '7',
    when: journal.entries.at(-1)!.when + 1,
    tag: '0002_check',
    breakpoints: true,
  });
  await writeFile(journalPath, JSON.stringify(journal));
  const nextSql = join(fixture, '0002_check.sql');
  await writeFile(nextSql, 'CREATE TABLE migration_probe (id integer);');
  const original = (
    await client.query<{ hash: string }>(
      'SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id LIMIT 1',
    )
  ).rows[0]!.hash;
  await client.query(
    "UPDATE drizzle.__drizzle_migrations SET hash='changed' WHERE id=1",
  );
  await assert.rejects(run(fixture), /checksum differs/);
  assert.equal(
    (
      await client.query<{ name: string | null }>(
        "SELECT to_regclass('migration_probe')::text AS name",
      )
    ).rows[0]!.name,
    null,
  );
  await client.query(
    'UPDATE drizzle.__drizzle_migrations SET hash=$1 WHERE id=1',
    [original],
  );

  await writeFile(
    nextSql,
    'CREATE TABLE migration_probe (id integer); --> statement-breakpoint SELECT nonexistent_migration_function();',
  );
  await assert.rejects(run(fixture));
  assert.equal(
    (
      await client.query<{ name: string | null }>(
        "SELECT to_regclass('migration_probe')::text AS name",
      )
    ).rows[0]!.name,
    null,
  );
  assert.deepEqual(await run(), { applied: 0, total: 2 });
  await writeFile(nextSql, 'CREATE TABLE migration_probe (id integer);');
  assert.deepEqual(await run(fixture), { applied: 1, total: 3 });
  await assert.rejects(run(), /history does not match/);
  const appliedSql = await readFile(nextSql, 'utf8');
  await writeFile(nextSql, appliedSql + '\n-- changed bytes');
  await assert.rejects(run(fixture), /checksum differs/);
  await writeFile(nextSql, appliedSql);

  let configured = false;
  await assert.rejects(
    migrateDatabase({
      connectionString,
      migrationsFolder: fixture,
      configure: async () => {
        configured = true;
        await assert.rejects(run(fixture), MigrationBusyError);
        throw new Error('Interrupted after migration commit');
      },
    }),
    /Interrupted after migration commit/,
  );
  assert.equal(configured, true);
  assert.deepEqual(await run(fixture), { applied: 0, total: 3 });

  await assert.rejects(
    migrateDatabase({
      connectionString,
      migrationsFolder: fixture,
      configure: async (locked) => {
        const pid = (
          await locked.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
        ).rows[0]!.pid;
        const disconnected = new Promise<void>((resolve) =>
          locked.once('error', () => resolve()),
        );
        await admin.query('SELECT pg_terminate_backend($1)', [pid]);
        await disconnected;
      },
    }),
  );
  assert.deepEqual(await run(fixture), { applied: 0, total: 3 });

  const holder = new Client({ connectionString });
  holder.on('error', () => {});
  try {
    await holder.connect();
    await holder.query(releaseLockSql);
    await assert.rejects(run(fixture), MigrationBusyError);
    const pid = (
      await holder.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
    ).rows[0]!.pid;
    await admin.query('SELECT pg_terminate_backend($1)', [pid]);
  } finally {
    await holder.end();
  }
  assert.deepEqual(await run(fixture), { applied: 0, total: 3 });
  journal.entries[2]!.when = journal.entries[1]!.when;
  await writeFile(journalPath, JSON.stringify(journal));
  await assert.rejects(run(fixture), /strictly increasing/);
  assert.equal(
    (
      await client.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM account_state',
      )
    ).rows[0]!.count,
    1,
  );
  console.log(
    'Migration checks passed: empty/populated databases, concurrent runners, checksum and history mismatches, SQL rollback, retry after commit, terminated lock owner, and invalid journal order.',
  );
} finally {
  await client.end();
  if (created) await admin.query(`DROP DATABASE ${database}`);
  await admin.end();
  await rm(fixture, { recursive: true, force: true });
}

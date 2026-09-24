import { readMigrationFiles, type MigrationMeta } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Client } from 'pg';
import { withReleaseLock, type ReleaseSession } from './release-lock.ts';

async function history(client: Client) {
  const exists = await client.query<{ table_name: string | null }>(
    "SELECT to_regclass('drizzle.__drizzle_migrations')::text AS table_name",
  );
  if (!exists.rows[0]!.table_name) return [];
  return (
    await client.query<{ hash: string; created_at: string }>(
      'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id',
    )
  ).rows;
}

function verifyHistory(
  applied: Awaited<ReturnType<typeof history>>,
  expected: MigrationMeta[],
  complete: boolean,
) {
  if (
    applied.length > expected.length ||
    (complete && applied.length !== expected.length)
  )
    throw new Error('Database migration history does not match this artifact.');
  for (const [index, row] of applied.entries()) {
    const migration = expected[index]!;
    if (
      row.created_at !== String(migration.folderMillis) ||
      row.hash !== migration.hash
    )
      throw new Error(
        `Database migration identity or checksum differs at position ${index}.`,
      );
  }
}

export async function migrateLockedDatabase(
  session: ReleaseSession,
  migrationsFolder: string,
) {
  const migrations = readMigrationFiles({
    migrationsFolder,
  });
  let previous = -1;
  for (const migration of migrations) {
    if (
      !Number.isSafeInteger(migration.folderMillis) ||
      migration.folderMillis <= previous
    )
      throw new Error(
        'Migration timestamps must be unique and strictly increasing.',
      );
    previous = migration.folderMillis;
  }
  const { client, assertConnected } = session;
  assertConnected();
  const applied = await history(client);
  verifyHistory(applied, migrations, false);
  if (applied.length === 0) {
    const old = await client.query<{ old_schema: string | null }>(
      "SELECT to_regclass('public.account_state')::text AS old_schema",
    );
    if (old.rows[0]?.old_schema)
      throw new Error('Old Quizmon database detected. Use a fresh database.');
  }
  await migrate(drizzle(client), {
    migrationsFolder,
  });
  verifyHistory(await history(client), migrations, true);
  assertConnected();
  return {
    applied: migrations.length - applied.length,
    total: migrations.length,
  };
}

export async function migrateDatabase(options: {
  connectionString: string;
  migrationsFolder: string;
  configure?: (client: Client) => Promise<void>;
}) {
  return withReleaseLock(
    { connectionString: options.connectionString },
    async (session) => {
      const result = await migrateLockedDatabase(
        session,
        options.migrationsFolder,
      );
      await options.configure?.(session.client);
      session.assertConnected();
      return result;
    },
  );
}

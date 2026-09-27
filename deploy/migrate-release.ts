import { readFile } from 'node:fs/promises';
import { readMigrationConnection } from './release-inputs.ts';
import { migrateLockedDatabase } from './migration-runner.ts';
import { withReleaseLock } from './release-lock.ts';

const file = process.argv[2];
if (!file)
  throw new Error('Usage: migrate-release.ts <migration-connection.json>');

try {
  const connection = readMigrationConnection(
    JSON.parse(await readFile(file, 'utf8')),
  );
  const result = await withReleaseLock(connection, async (session) => {
    return migrateLockedDatabase(session, '/opt/quizmon/server/migrations');
  });
  console.log(JSON.stringify(result));
} catch {
  console.error(
    'Migration failed. Check the migration connection, database permissions, and migration history.',
  );
  process.exitCode = 1;
}

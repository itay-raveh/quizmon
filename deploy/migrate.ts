import { publishPlayerTables } from './publication.ts';
import { fileURLToPath } from 'node:url';
import { migrateDatabase } from './migration-runner.ts';
import { Client } from 'pg';
import { rebuildRoundScores } from './rebuild-round-score.ts';

const admin = new Client({
  connectionString: 'postgresql://postgres@127.0.0.1:5548/postgres',
});
await admin.connect();
try {
  for (const name of ['quizmon', 'powersync']) {
    const exists = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname=$1',
      [name],
    );
    if (!exists.rowCount) await admin.query(`CREATE DATABASE ${name}`);
  }
} finally {
  await admin.end();
}

await migrateDatabase({
  connectionString: 'postgresql://postgres@127.0.0.1:5548/quizmon',
  migrationsFolder: fileURLToPath(
    new URL('../server/migrations', import.meta.url),
  ),
  configure: async (client) => {
    await publishPlayerTables(client);
    await rebuildRoundScores(client);
  },
});
console.log(
  'Database migrations verified. Only explicit player-data tables are published.',
);

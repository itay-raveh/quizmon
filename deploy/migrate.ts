import { publishPlayerTables } from './publication.ts';
import { fileURLToPath } from 'node:url';
import { migrateDatabase } from './migration-runner.ts';

await migrateDatabase({
  connectionString: 'postgresql://postgres@127.0.0.1:5548/quizmon_pilot',
  migrationsFolder: fileURLToPath(
    new URL('../server/migrations', import.meta.url),
  ),
  configure: publishPlayerTables,
});
console.log(
  'Database migrations verified. Only explicit player-data tables are published.',
);

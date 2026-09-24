import type { Client } from 'pg';

export async function publishPlayerTables(client: Pick<Client, 'query'>) {
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
      CREATE PUBLICATION powersync FOR TABLE player;
    END IF;
  END $$`);
  await client.query('ALTER PUBLICATION powersync SET TABLE player, round');
}

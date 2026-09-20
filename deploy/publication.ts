import type { Client } from 'pg';

export async function publishPlayerTables(client: Pick<Client, 'query'>) {
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
      CREATE PUBLICATION powersync FOR TABLE account_state;
    END IF;
  END $$`);
  await client.query(
    'ALTER PUBLICATION powersync SET TABLE account_state, player_pokemon, sync_issues, completion_facts',
  );
}

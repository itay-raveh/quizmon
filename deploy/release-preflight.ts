import { readFile } from 'node:fs/promises';
import { Client, type ClientConfig } from 'pg';
import { VAPID_PUBLIC_KEY } from '../src/features/reminders/reminder-config.ts';
import { readPreparedRelease } from './prepare-release.ts';
import {
  readMigrationConnection,
  readWorkerSecrets,
} from './release-inputs.ts';

async function readInput(path: string, label: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new Error(`Cannot read valid JSON for ${label}.`);
  }
}

async function checkMigrationConnection(config: ClientConfig) {
  const client = new Client(config);
  let disconnected = false;
  client.on('error', () => {
    disconnected = true;
  });
  try {
    await client.connect();
    const result = await client.query<{
      role: string;
      database: string;
      replica: boolean;
      read_only: string;
      ssl: boolean;
    }>(`SELECT current_user AS role, current_database() AS database,
      pg_is_in_recovery() AS replica,
      current_setting('transaction_read_only') AS read_only,
      (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS ssl`);
    const row = result.rows[0];
    if (
      disconnected ||
      !row ||
      row.role !== config.user ||
      row.database !== config.database ||
      row.replica ||
      row.read_only !== 'off' ||
      !row.ssl
    )
      throw new Error();
  } catch {
    // Driver errors can contain credentials or values copied from mounted input.
    throw new Error(
      'Migration connection check failed. Verify DNS, certificate trust and hostname, credentials, and writable primary selection.',
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function readReleaseInputs(
  root: string,
  configFile: string,
  secretsFile: string,
  databaseFile: string,
) {
  const prepared = await readPreparedRelease(root, configFile);
  readWorkerSecrets(
    await readInput(secretsFile, 'Worker secrets'),
    VAPID_PUBLIC_KEY,
  );
  const database = readMigrationConnection(
    await readInput(databaseFile, 'migration connection'),
  );
  return { prepared, database };
}

export async function preflightRelease({
  database,
}: Awaited<ReturnType<typeof readReleaseInputs>>) {
  await checkMigrationConnection(database);
  return {
    configuration: true,
    workerSecrets: true,
    migrationTlsConnection: true,
  };
}

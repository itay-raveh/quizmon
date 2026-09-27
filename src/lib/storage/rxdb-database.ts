import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import type { RxCollection, RxDatabase, RxStorage } from 'rxdb';
import {
  deviceSchema,
  migrations,
  playerSchema,
  roundSchema,
  type DeviceRecord,
  type SyncedPlayer,
  type SyncedRound,
} from './rxdb-schema.ts';

addRxPlugin(RxDBMigrationSchemaPlugin);

interface PlayerCollections {
  players: RxCollection<SyncedPlayer>;
  rounds: RxCollection<SyncedRound>;
  device: RxCollection<DeviceRecord>;
}

export type PlayerDatabase = RxDatabase<PlayerCollections>;

export async function openPlayerDatabase(
  name: string,
  storage: RxStorage<unknown, unknown> = getRxStorageDexie(),
  multiInstance = true,
): Promise<PlayerDatabase> {
  const db = await createRxDatabase<PlayerCollections>({
    name,
    storage,
    multiInstance,
  });
  try {
    await db.addCollections({
      players: {
        schema: playerSchema,
        migrationStrategies: migrations.players,
      },
      rounds: {
        schema: roundSchema,
        migrationStrategies: migrations.rounds,
      },
      device: {
        schema: deviceSchema,
        migrationStrategies: migrations.device,
      },
    });
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

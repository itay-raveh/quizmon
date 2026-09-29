import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import type { RxCollection, RxDatabase, RxStorage } from 'rxdb';
import {
  deviceSchema,
  dailyReceiptSchema,
  playerSchema,
  roundSchema,
  type DailyReceipt,
  type DeviceRecord,
  type SyncedPlayer,
  type SyncedRound,
} from './rxdb-schema.ts';

interface PlayerCollections {
  players: RxCollection<SyncedPlayer>;
  rounds: RxCollection<SyncedRound>;
  device: RxCollection<DeviceRecord>;
  dailyReceipts: RxCollection<DailyReceipt>;
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
      players: { schema: playerSchema },
      rounds: { schema: roundSchema },
      device: { schema: deviceSchema },
      dailyReceipts: { schema: dailyReceiptSchema },
    });
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

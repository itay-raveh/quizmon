import { describe, expect, it } from 'vitest';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { createRxDatabase } from 'rxdb/plugins/core';
import type { RxCollection } from 'rxdb';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { openPlayerDatabase } from './rxdb-database';
import { deviceSchema } from './rxdb-schema';

describe('RxDB IndexedDB persistence', () => {
  it('reopens a device save without losing the record', async () => {
    const name = `quizmon_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
    const first = await openPlayerDatabase(name, storage, false);
    await first.device.insert({ id: 'state', payload: { rounds: 3 } });
    await first.players.insert({
      id: 'guest',
      ownerId: 'guest',
      profile: createTrainerProfile(),
      settings: null,
    });
    await first.close();

    const second = await openPlayerDatabase(name, storage, false);
    expect((await second.device.findOne('state').exec())?.payload).toEqual({
      rounds: 3,
    });
    expect((await second.players.findOne('guest').exec())?.profile.name).toBe(
      '',
    );
    await second.remove();
  });

  it('replays an ordered migration for an existing IndexedDB record', async () => {
    const name = `quizmon_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
    const first = await openPlayerDatabase(name, storage, false);
    await first.device.insert({ id: 'state', payload: { rounds: 3 } });
    await first.close();

    const second = await createRxDatabase<{
      device: RxCollection<{ id: string; payload: object; migrated: boolean }>;
    }>({
      name,
      storage,
      multiInstance: false,
    });
    try {
      const { device } = await second.addCollections({
        device: {
          schema: {
            ...deviceSchema,
            version: 1,
            properties: {
              ...deviceSchema.properties,
              migrated: { type: 'boolean' },
            },
            required: [...deviceSchema.required, 'migrated'],
          },
          migrationStrategies: {
            1: (old: { id: string; payload: object }) => ({
              ...old,
              migrated: true,
            }),
          },
          autoMigrate: false,
        },
      });
      const migrated = device as unknown as RxCollection<{
        id: string;
        payload: object;
        migrated: boolean;
      }>;
      await migrated.getMigrationState().migratePromise();
      expect((await migrated.findOne('state').exec())?.migrated).toBe(true);
      expect((await migrated.findOne('state').exec())?.payload).toEqual({
        rounds: 3,
      });
    } finally {
      await second.remove();
    }
  });
});

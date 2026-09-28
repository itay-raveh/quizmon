import { describe, expect, it } from 'vitest';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { createRxDatabase } from 'rxdb/plugins/core';
import type { RxCollection } from 'rxdb';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { openPlayerDatabase } from './rxdb-database';
import { playerSchema } from './rxdb-schema';

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

  it('refuses to silently migrate an old browser database', async () => {
    const name = `quizmon_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
    const first = await createRxDatabase<{
      players: RxCollection;
    }>({ name, storage, multiInstance: false });
    const old = await first.addCollections({
      players: { schema: { ...playerSchema, version: 0 } },
    });
    await old.players.insert({
      id: 'guest',
      ownerId: 'guest',
      profile: createTrainerProfile(),
      settings: null,
    });
    await first.close();
    await expect(openPlayerDatabase(name, storage, false)).rejects.toThrow(
      'manual question-ID cutoff',
    );
  });
});

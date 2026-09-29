import { describe, expect, it } from 'vitest';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { openPlayerDatabase } from './rxdb-database';

describe('RxDB IndexedDB persistence', () => {
  it('reopens a device save without losing the record', async () => {
    const name = `quizmon_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
    const first = await openPlayerDatabase(name, storage, false);
    await first.device.insert({ id: 'state', payload: { rounds: 3 } });
    await first.players.insert({
      id: 'guest',
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
});

import { afterEach, expect, it, vi } from 'vitest';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import {
  legacyProgress,
  openLegacyDatabase,
} from '../../../tests/legacy-progress';
import { compactCompletion } from '../../domain/sync/compact-rounds';
import { parseRound } from '../../domain/player/schemas/round';
import { completeRound } from '../../domain/player/game-history';
import { openPlayerDatabase, type PlayerDatabase } from './rxdb-database';
import { readGameData, readDeviceState } from './rxdb-game';
import type { PlayerData } from '../../domain/player/player-save';
import { parseBackup, restoreBackup } from '../../features/settings/backup';
import { discardSavedRounds } from './round-storage';

let db: PlayerDatabase | undefined;
let data: PlayerData;
vi.mock('./player-storage', () => ({
  getPlayerDatabase: () => db,
  recoveryDatabase: () => db,
  currentOwnerId: () => 'guest',
  readPlayerRestoreId: () => null,
  readPlayerData: () => structuredClone(data),
  refreshPlayerData: async () => {
    data = (await readGameData(db!, 'guest')).data;
  },
}));
vi.mock('../analytics', () => ({ trackGameCompleted: vi.fn() }));

afterEach(async () => {
  await db?.remove();
  db = undefined;
});

it('commits a migrated completion before deleting its device receipt and retains an unsupported unfinished Daily claim', async () => {
  const name = `quizmon_receipt_${crypto.randomUUID().replaceAll('-', '')}`;
  const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
  const old = await openLegacyDatabase(name, storage);
  const fixture = legacyProgress();
  await old.device.insert({
    id: 'state',
    payload: { restoreId: null, dailyAttempts: {} },
  });
  await old.device.insert({ id: 'round:completed', payload: fixture.snapshot });
  await old.device.insert({
    id: 'round:daily',
    payload: {
      ...fixture.snapshot,
      completedAt: undefined,
      mode: { kind: 'daily', date: '2026-09-27' },
      questions: [],
    },
  });
  await old.close();
  db = await openPlayerDatabase(name, storage, false);
  data = (await readGameData(db, 'guest')).data;
  const receipt = (await db.device.findOne('round:completed').exec())!;
  const round = parseRound(receipt.payload)!;
  const expected = compactCompletion(
    completeRound(round, round.completedAt!, '').completion,
  );
  const actualRemove = receipt.remove.bind(receipt);
  const removal = vi.spyOn(receipt, 'remove').mockImplementation(async () => {
    // Simulate a crash after the durable fact write but before receipt deletion.
    expect((await db!.rounds.findOne(expected.id).exec())?.answers).toEqual(
      expected.answers,
    );
    throw new Error('interrupted receipt deletion');
  });
  await expect(discardSavedRounds()).rejects.toThrow(
    'interrupted receipt deletion',
  );
  expect(await db.device.findOne('round:completed').exec()).not.toBeNull();
  removal.mockImplementation(actualRemove);
  await discardSavedRounds();
  await discardSavedRounds();
  expect((await db.rounds.find().exec()).map((doc) => doc.id)).toEqual([
    expected.id,
  ]);
  expect(
    (await db.rounds.findOne(expected.id).exec())!.toMutableJSON(),
  ).toEqual({ ...expected, ownerId: 'guest' });
  expect((await readDeviceState(db)).dailyAttempts['2026-09-27']).toBe(true);
  expect((await db.device.find().exec()).map((doc) => doc.id)).toEqual([
    'state',
  ]);
  const backup = parseBackup(
    JSON.stringify({
      format: 'quizmon-backup-v3',
      exportedAt: fixture.snapshot.completedAt,
      accountId: null,
      schemaVersions: { players: 0, rounds: 0, device: 0 },
      player: null,
      rounds: [],
      device: [
        { id: 'state', payload: { restoreId: null, dailyAttempts: {} } },
        { id: 'round:completed', payload: fixture.snapshot },
      ],
    }),
  );
  expect(backup.rounds).toEqual([{ ...expected, ownerId: 'guest' }]);
  await restoreBackup(backup);
  await restoreBackup(backup);
  expect((await db.rounds.find().exec()).map((doc) => doc.id)).toEqual([
    expected.id,
  ]);
});

it('does not delete an invalid completed receipt during startup cleanup', async () => {
  db = await openPlayerDatabase(
    `quizmon_invalid_receipt_${crypto.randomUUID().replaceAll('-', '')}`,
    getRxStorageDexie({ indexedDB, IDBKeyRange }),
    false,
  );
  const payload = { completedAt: '2026-09-27T10:00:00.000Z', answers: [] };
  await db.device.insert({ id: 'round:invalid', payload });
  await expect(discardSavedRounds()).rejects.toThrow('needs recovery');
  expect((await db.device.findOne('round:invalid').exec())!.payload).toEqual(
    payload,
  );
});

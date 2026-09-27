import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { expect, it } from 'vitest';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { archiveCompletion } from '../../domain/sync/round-facts';
import { boardRows } from '../../../server/rxdb-read';
import { completion } from '../../../tests/online/progress-fixtures';
import { openPlayerDatabase } from './rxdb-database';
import {
  ensureDeviceState,
  readGameData,
  writeCompletedRound,
  writePlayerPreferences,
} from './rxdb-game';

it('projects saved rounds and preferences after IndexedDB reload', async () => {
  const name = `quizmon_game_${crypto.randomUUID().replaceAll('-', '')}`;
  const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
  const first = await openPlayerDatabase(name, storage, false);
  await ensureDeviceState(first);
  const profile = { ...createTrainerProfile(), name: 'Trainer' };
  await writePlayerPreferences(first, 'guest', {
    settings: defaultGameSettings,
  });
  await writePlayerPreferences(first, 'guest', { profile });
  const fact = archiveCompletion(completion('training'));
  expect(await writeCompletedRound(first, 'guest', fact)).toBe(true);
  expect(await writeCompletedRound(first, 'guest', fact)).toBe(false);
  await first.close();

  const second = await openPlayerDatabase(name, storage, false);
  const { data } = await readGameData(second, 'guest');
  expect(data.profile?.name).toBe('Trainer');
  expect(data.settings).toEqual(defaultGameSettings);
  expect(Object.keys(data.results.training)).toHaveLength(1);
  await expect(
    writePlayerPreferences(second, 'guest', {
      settings: { ...defaultGameSettings, soundVolume: 2 },
    }),
  ).rejects.toThrow();
  expect((await readGameData(second, 'guest')).data.settings).toEqual(
    defaultGameSettings,
  );
  await writePlayerPreferences(second, 'guest', { settings: null });
  expect((await readGameData(second, 'guest')).data.settings).toBeNull();
  await second.remove();
});

it('credits only the first Daily round after two offline devices sync', async () => {
  const name = `quizmon_daily_${crypto.randomUUID().replaceAll('-', '')}`;
  const db = await openPlayerDatabase(
    name,
    getRxStorageDexie({ indexedDB, IDBKeyRange }),
    false,
  );
  try {
    await ensureDeviceState(db);
    const first = archiveCompletion(
      completion('daily', { completedAt: '2026-09-11T09:00:00.000Z' }),
    );
    const second = archiveCompletion(
      completion('daily', { completedAt: '2026-09-11T10:00:00.000Z' }),
    );
    second.puzzle_id = 'b'.repeat(64);
    second.data.config.daily_track = { difficulty: 2, scope: 'all' };
    await writeCompletedRound(db, 'guest', second);
    await writeCompletedRound(db, 'guest', first);
    const { data } = await readGameData(db, 'guest');
    expect(data.results.progress.correctQuestionTypes['type-check']).toBe(4);
    const rows = await boardRows(
      db,
      'daily',
      null,
      '2026-09-11',
      first.puzzle_id!,
    );
    expect(rows.map((row) => row.roundId)).toEqual([first.id]);
    expect(
      await boardRows(db, 'daily', null, '2026-09-11', second.puzzle_id),
    ).toEqual([]);
  } finally {
    await db.remove();
  }
});

import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { expect, it } from 'vitest';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { compactCompletion } from '../../domain/sync/compact-rounds';
import { completion } from '../../../tests/online/progress-fixtures';
import { openPlayerDatabase } from './rxdb-database';
import {
  ensureDeviceState,
  readDeviceState,
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
  const fact = compactCompletion(completion('training'));
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
  const invalid = structuredClone(fact);
  invalid.id = crypto.randomUUID();
  Reflect.set(invalid.answers[0]!, 'type', 'retired-type');
  await second.rounds.insert({
    ...invalid,
    ownerId: 'guest',
  });
  await expect(readGameData(second, 'guest')).rejects.toThrow(
    'A saved completed round is invalid.',
  );
  await second.remove();
});

it('returns cloneable Daily attempts from RxDB documents', async () => {
  const db = await openPlayerDatabase(
    `quizmon_daily_save_${crypto.randomUUID().replaceAll('-', '')}`,
    getRxStorageDexie({ indexedDB, IDBKeyRange }),
    false,
  );
  try {
    await ensureDeviceState(db);
    const saved = await readDeviceState(db);
    const date = '2026-09-27';
    const round = {
      elapsedMilliseconds: 0,
      questionCount: 1,
      roundId: crypto.randomUUID(),
      seed: 's',
      answers: [],
      questions: [
        {
          id: 'q',
          questionType: 'pokemonTypes',
          category: 'knowledge',
          subject: { kind: 'pokemon', name: 'A', generation: 'I', types: [] },
          repetition: {
            identity: 'A',
            subjects: [],
            primary: [],
            distractors: [],
          },
          options: ['A'],
          answer: { interaction: 'single-choice', correctOptions: ['A'] },
          prompt: { kind: 'text', text: 'A?' },
          media: { kind: 'none' },
        },
      ],
      mode: { kind: 'daily', date },
      settings: defaultGameSettings,
    };
    await (await db.device.findOne('state').exec())!.incrementalModify(
      (data) => ({
        ...data,
        payload: {
          ...saved,
          dailyAttempts: {
            [date]: round,
            invalid: {
              ...round,
              questions: [
                { ...round.questions[0], questionType: 'retired-type' },
              ],
            },
          },
        },
      }),
    );
    const attempts = (await readDeviceState(db)).dailyAttempts;
    const attempt = attempts[date];
    expect(structuredClone(attempt!).mode).toEqual(round.mode);
    expect(attempts.invalid).toBeUndefined();
  } finally {
    await db.remove();
  }
});

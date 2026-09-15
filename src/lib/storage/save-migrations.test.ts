import fixture from '../../../tests/fixtures/player-save.v6.json';
import { catalog } from '../../../tests/fixtures/catalog';
import {
  dailySettings,
  buildDailyForTest,
} from '../../../tests/fixtures/daily';
import { createBackup, parseBackup } from '../../features/settings/backup';
import { readPlayerSave, PLAYER_STORAGE_KEY } from './player-storage';
import {
  ACTIVE_GAME_KEY,
  DAILY_ATTEMPTS_KEY,
  readActiveGame,
  readDailyAttempts,
  writeActiveGame,
} from './active-game-storage';
import { inspectSavedData } from './save-recovery';
import { getSaveIssue } from './save-health';

const populatedSave = () => ({
  ...structuredClone(fixture),
  data: {
    ...structuredClone(fixture.data),
    profile: {
      version: 1,
      name: 'Leaf',
      createdAt: '2026-09-01',
      hasBeenRevealed: true,
      partnerPokemon: 'pikachu',
      specialty: null,
    },
    results: {
      ...structuredClone(fixture.data.results),
      training: {
        'score:3': {
          answers: [],
          contentVersion: 18,
          scoreVersion: 3,
          questionCount: 10,
          correctCount: 5,
          score: 12345,
          elapsedSeconds: 20,
        },
      },
      progress: {
        ...structuredClone(fixture.data.results.progress),
        quickAttackRounds: 7,
        correctPokemon: ['pikachu'],
      },
    },
  },
});
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

it('upgrades a populated schema 6 save without losing scores, profile, or progress', () => {
  const old = populatedSave();
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(old));
  const saved = readPlayerSave();
  expect(saved.version).toBe(7);
  expect(saved.data.results.training).toEqual(old.data.results.training);
  expect(saved.data.results.progress.quickAttackRounds).toBe(7);
  expect(saved.data.profile?.name).toBe('Leaf');
  expect(saved.data.profile).not.toHaveProperty('version');
  expect(saved.data.results.progress).not.toHaveProperty('version');
  expect(saved.data.results.streak).not.toHaveProperty('version');
  expect(JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)!)).toEqual(saved);
  expect(createBackup()).not.toHaveProperty('version');
});

it('reads the previous backup wrapper and returns only the current save schema', () => {
  const old = populatedSave();
  const backup = parseBackup(
    JSON.stringify({
      format: 'quizmon-backup',
      version: 1,
      exportedAt: '2026-09-01T00:00:00.000Z',
      save: old,
    }),
  );
  expect(backup.save.version).toBe(7);
  expect(backup.save.data.results.training).toEqual(old.data.results.training);
  expect(backup).not.toHaveProperty('version');
});

it('preserves the old bytes when writing an upgraded save fails, then retries successfully', () => {
  const raw = JSON.stringify(populatedSave(), null, 3);
  localStorage.setItem(PLAYER_STORAGE_KEY, raw);
  const write = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
  expect(readPlayerSave().version).toBe(7);
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(raw);
  write.mockRestore();
  expect(readPlayerSave().version).toBe(7);
  expect(JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)!)).toHaveProperty(
    'version',
    7,
  );
});

it.each(['profile', 'progress', 'streak'] as const)(
  'rejects a malformed schema 6 %s marker without changing the save',
  (part) => {
    const old = populatedSave();
    if (part === 'profile') old.data.profile.version = 99;
    else old.data.results[part].version = 99;
    const raw = JSON.stringify(old);
    localStorage.setItem(PLAYER_STORAGE_KEY, raw);
    expect(() => readPlayerSave()).toThrow(
      expect.objectContaining({ kind: 'invalid' }),
    );
    expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(raw);
  },
);

it.each([2, 3])(
  'upgrades round format %i for both the active round and saved Daily attempts',
  (version) => {
    const date = '2026-09-15';
    const questions = buildDailyForTest(date);
    const snapshot = {
      version,
      playerRestoreId: null,
      questions,
      answers: [],
      mode: { kind: 'daily', date, track: { difficulty: 3, scope: 'all' } },
      settings: dailySettings,
      contentVersion: catalog.contentVersion,
      seed: 'saved-daily',
      questionCount: 5,
      elapsedMilliseconds: 2500,
    };
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(populatedSave()));
    sessionStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(snapshot));
    localStorage.setItem(
      DAILY_ATTEMPTS_KEY,
      JSON.stringify({ [`${date}:3:all`]: snapshot }),
    );
    inspectSavedData();
    expect(getSaveIssue()).toBeNull();
    expect(readActiveGame(catalog)).toEqual({ ...snapshot, version: 7 });
    expect(readDailyAttempts(date, null)[`${date}:3:all`]).toEqual({
      ...snapshot,
      version: 7,
    });
    expect(writeActiveGame(readActiveGame(catalog)!)).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(ACTIVE_GAME_KEY)!)).toHaveProperty(
      'version',
      7,
    );
    expect(
      (
        JSON.parse(localStorage.getItem(DAILY_ATTEMPTS_KEY)!) as Record<
          string,
          unknown
        >
      )[`${date}:3:all`],
    ).toHaveProperty('version', 7);
  },
);

it('preserves an old round verbatim when catalog validation rejects it', () => {
  const questions = buildDailyForTest('2026-09-15');
  questions[questions.length - 1] = {
    ...questions.at(-1)!,
    subject: { ...questions.at(-1)!.subject, name: 'missing-from-catalog' },
  };
  const raw = JSON.stringify(
    {
      version: 3,
      playerRestoreId: null,
      questions,
      answers: [],
      mode: { kind: 'training' },
      settings: dailySettings,
      contentVersion: catalog.contentVersion,
      seed: 'invalid-old-round',
      questionCount: questions.length,
      elapsedMilliseconds: 1000,
    },
    null,
    3,
  );
  sessionStorage.setItem(ACTIVE_GAME_KEY, raw);
  inspectSavedData();
  expect(readActiveGame(catalog)).toBeNull();
  expect(sessionStorage.getItem(ACTIVE_GAME_KEY)).toBe(raw);
});

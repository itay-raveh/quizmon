import { buildQuestions } from '@/game/game';
import { createSeededRandom } from '@/game/random';
import { catalog } from './fixtures/catalog';
import { emptyQuestionHistory } from '@/game/question-history';
import v1Fixture from './fixtures/player-backup.v1.json';
import {
  createBackup,
  downloadBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
  restoreBackup,
  type PlayerBackup,
} from '@/game/backup';
import { readActiveGame, writeActiveGame } from '@/game/active-game';
import { defaultModifiers } from '@/game/modifiers';
import { createTrainerProfile } from '@/game/profile-data';
import {
  canPersistPlayerData,
  PLAYER_STORAGE_KEY,
  readPlayerSave,
  subscribeToPlayerRestore,
  updatePlayerData,
} from '@/game/player-storage';
import { readDailyResult, saveResult } from '@/game/storage';
import type { GameResult } from '@/game/types';

const result: GameResult = {
  answers: [
    {
      category: 'identity',
      cluesUsed: 0,
      correct: true,
      generation: 'I',
      pokemonName: 'pikachu',
      points: 1000,
      questionType: 'pokedex-scan',
      responseMilliseconds: 1500,
      speedBonus: 2000,
    },
  ],
  contentVersion: 8,
  correctCount: 1,
  elapsedMilliseconds: 1500,
  elapsedSeconds: 1,
  questionCount: 1,
  score: 5000,
  scoreVersion: 3,
};

const populate = () => {
  saveResult({ kind: 'daily', date: '2026-09-07' }, result);
  const save = readPlayerSave();
  updatePlayerData({
    pokedex: ['pikachu'],
    profile: {
      ...createTrainerProfile(),
      name: 'Leaf',
      partnerPokemon: 'pikachu',
      specialty: 'identity',
      hasBeenRevealed: true,
    },
    generationPromptAnswered: true,
    settings: {
      ...defaultModifiers,
      answerFlow: 'auto',
      reduceMotion: true,
      soundVolume: 0.4,
      timerDisplay: 'milliseconds',
      trainingMode: 'custom',
      generations: ['I', 'II'],
      questionTypes: ['pokedex-scan', 'generation-roundup'],
    },
    results: {
      ...save.data.results,
      league: { completed: true, seed: 'fixed-league-retry' },
      streak: { version: 1, creditedDates: ['2026-09-07'] },
      training: { league: result, custom: result },
      progress: {
        ...save.data.results.progress,
        championAnswersWithoutClues: 5,
        masteryRounds: 3,
        quickAttackCompleted: true,
      },
    },
  });
};

const active = () =>
  writeActiveGame({
    answers: [],
    contentVersion: 8,
    elapsedMilliseconds: 100,
    mode: { kind: 'training' },
    modifiers: defaultModifiers,
    questionCount: 10,
    questions: buildQuestions(
      catalog,
      defaultModifiers,
      createSeededRandom('saved-round'),
    ),
    seed: 'unfinished',
  });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

it.each([
  [null, ''],
  ['', ''],
  ['Leaf', 'Leaf-'],
  ['Leaf / Red', 'Leaf-Red-'],
  ['Élodie', 'Élodie-'],
  ['<>:"/\\|?*', ''],
])('uses a filename-safe chosen Trainer name: %s', (name, expected) => {
  if (name !== null)
    updatePlayerData({ profile: { ...createTrainerProfile(), name } });
  let filename = '';
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download;
  });
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:backup',
    revokeObjectURL: vi.fn(),
  });
  vi.useFakeTimers();
  try {
    downloadBackup();
    expect(filename).toBe(
      `quizmon-backup-${expected}${new Date().toISOString().slice(0, 10)}.json`,
    );
    vi.runAllTimers();
  } finally {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});

it('round-trips every portable field and replaces rather than merges progress', () => {
  populate();
  const backup = parseBackup(JSON.stringify(createBackup()));
  expect(backup.save.data.profile?.name).toBe('Leaf');
  saveResult({ kind: 'daily', date: '2026-09-06' }, result);
  localStorage.setItem('quizmon.daily-reminder-subscription.v1', 'device-only');
  localStorage.setItem(
    'quizmon.daily-reminder-prompt.v1',
    '{"version":1,"completedDailyCount":2}',
  );
  localStorage.setItem(
    'quizmon.daily-reminder-last-completed.v1',
    '2026-09-06',
  );
  localStorage.setItem('unrelated', 'keep');
  active();
  expect(readActiveGame(catalog)).not.toBeNull();
  restoreBackup(backup);
  expect(readPlayerSave().data).toEqual(backup.save.data);
  expect(readPlayerSave().restoreId).not.toBeNull();
  expect(readDailyResult('2026-09-06')).toBeNull();
  expect(readActiveGame(catalog)).toBeNull();
  expect(localStorage.getItem('quizmon.daily-reminder-subscription.v1')).toBe(
    'device-only',
  );
  expect(localStorage.getItem('quizmon.daily-reminder-prompt.v1')).toContain(
    '"completedDailyCount":2',
  );
  expect(localStorage.getItem('quizmon.daily-reminder-last-completed.v1')).toBe(
    '2026-09-06',
  );
  expect(localStorage.getItem('unrelated')).toBe('keep');
  expect(JSON.stringify(backup)).not.toContain('device-only');
});

it('migrates all existing keys once and keeps the migrated save authoritative', () => {
  populate();
  const original = readPlayerSave().data;
  const migrated = {
    ...original,
    leagueLineup: {
      seed: 'fixed-league-retry',
      contentVersion: 0,
      questions: [],
    },
  };
  localStorage.clear();
  localStorage.setItem('quizmon.results.v2', JSON.stringify(original.results));
  localStorage.setItem(
    'quizmon.training-settings.v2',
    JSON.stringify(original.settings),
  );
  localStorage.setItem(
    'quizmon.trainer-profile.v1',
    JSON.stringify({ ...original.profile, cardNumber: 'obsolete' }),
  );
  localStorage.setItem('quizmon.generation-prompt.v1', '1');
  expect(readPlayerSave().data).toEqual(migrated);
  const persisted = localStorage.getItem(PLAYER_STORAGE_KEY);
  expect(localStorage.getItem('quizmon.results.v2')).toBeNull();
  localStorage.setItem('quizmon.results.v2', '{}');
  expect(readPlayerSave().data).toEqual(migrated);
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(persisted);
});

it('keeps new-player settings and profile absent through a round trip', () => {
  const backup = createBackup();
  expect(backup.save.data.settings).toBeNull();
  expect(backup.save.data.profile).toBeNull();
  expect(backup.save.data.generationPromptAnswered).toBe(false);
  restoreBackup(backup);
  expect(readPlayerSave().data).toEqual(backup.save.data);
});

it.for<(backup: PlayerBackup) => unknown>([
  (backup) => ({
    ...backup,
    format: 'other-app',
  }),
  (backup) => ({ ...backup, version: 99 }),
  (backup) => ({
    ...backup,
    exportedAt: '2026-02-30T12:00:00.000Z',
  }),
  (backup) => ({
    ...backup,
    save: { ...backup.save, version: 99 },
  }),
  (backup) => ({
    ...backup,
    save: {
      ...backup.save,
      data: {
        ...backup.save.data,
        settings: { ...defaultModifiers, soundVolume: 9 },
      },
    },
  }),
  (backup) => ({
    ...backup,
    save: {
      ...backup.save,
      data: {
        ...backup.save.data,
        results: {
          ...backup.save.data.results,
          daily: {
            '2026-09-07': {
              ...result,
              answers: [{ ...result.answers[0], generation: 'X' }],
            },
          },
        },
      },
    },
  }),
  (backup) => ({
    ...backup,
    save: {
      ...backup.save,
      data: {
        ...backup.save.data,
        profile: { ...backup.save.data.profile, version: 99 },
      },
    },
  }),
  (backup) => ({
    ...backup,
    save: {
      ...backup.save,
      data: {
        ...backup.save.data,
        results: {
          ...backup.save.data.results,
          progress: {
            ...backup.save.data.results.progress,
            correctCategories: { identity: -1 },
          },
        },
      },
    },
  }),
])('rejects invalid imports without changing storage (%#)', (damage) => {
  populate();
  const before = localStorage.getItem(PLAYER_STORAGE_KEY);
  expect(() => parseBackup(JSON.stringify(damage(createBackup())))).toThrow();
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(before);
});

it.for([[], ['unknown'], null, 'I'])(
  'rejects invalid backup selections without changing storage: %j',
  (value) => {
    populate();
    const before = localStorage.getItem(PLAYER_STORAGE_KEY);
    for (const field of ['generations', 'questionTypes']) {
      const backup = createBackup();
      backup.save.data.settings = { ...defaultModifiers, [field]: value };
      expect(() => parseBackup(JSON.stringify(backup))).toThrow();
      expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(before);
    }
  },
);

it('rejects malformed JSON and oversized files', () => {
  expect(() => parseBackup('{')).toThrow('valid JSON');
  expect(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1))).toThrow(
    'too large',
  );
});

it('revalidates a preview before committing it', () => {
  const backup = createBackup();
  backup.save.data.results.progress.masteryRounds = -1;
  const before = localStorage.getItem(PLAYER_STORAGE_KEY);
  expect(() => restoreBackup(backup)).toThrow();
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(before);
});

it('leaves progress and the unfinished round unchanged when a restore write fails', () => {
  const backup = createBackup();
  populate();
  active();
  const before = localStorage.getItem(PLAYER_STORAGE_KEY);
  const round = sessionStorage.getItem('quizmon.active-game.v1');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError');
  });
  expect(() => restoreBackup(backup)).toThrow('has not changed');
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(before);
  expect(sessionStorage.getItem('quizmon.active-game.v1')).toBe(round);
});

it('does not replace a corrupt or newer existing save during normal play', () => {
  for (const raw of ['{', '{"version":99,"data":{"keep":"me"}}']) {
    localStorage.setItem(PLAYER_STORAGE_KEY, raw);
    expect(updatePlayerData({ generationPromptAnswered: true })).toBe(false);
    expect(() => createBackup()).toThrow();
    expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(raw);
  }
});

it('preserves legacy bytes when migration cannot write, while allowing export', () => {
  localStorage.setItem(
    'quizmon.results.v2',
    JSON.stringify({ daily: { '2026-09-07': result } }),
  );
  const legacy = localStorage.getItem('quizmon.results.v2');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError');
  });
  expect(createBackup().save.data.results.daily['2026-09-07']).toEqual(result);
  expect(localStorage.getItem('quizmon.results.v2')).toBe(legacy);
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBeNull();
});

it('preserves damaged legacy data instead of migrating empty progress over it', () => {
  localStorage.setItem('quizmon.results.v2', '{');
  expect(() => createBackup()).toThrow();
  expect(updatePlayerData({ generationPromptAnswered: true })).toBe(false);
  expect(localStorage.getItem('quizmon.results.v2')).toBe('{');
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBeNull();
});

it('invalidates an old active round even when session removal is blocked', () => {
  const backup = createBackup();
  active();
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('Blocked');
  });
  restoreBackup(backup);
  expect(sessionStorage.getItem('quizmon.active-game.v1')).not.toBeNull();
  expect(readActiveGame(catalog)).toBeNull();
});

it('notifies another tab on restore, but not ordinary saves', () => {
  const onRestore = vi.fn();
  const stop = subscribeToPlayerRestore(onRestore);
  const previous = JSON.stringify(readPlayerSave());
  populate();
  const ordinary = localStorage.getItem(PLAYER_STORAGE_KEY);
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: PLAYER_STORAGE_KEY,
      oldValue: previous,
      newValue: ordinary,
      storageArea: localStorage,
    }),
  );
  expect(onRestore).not.toHaveBeenCalled();
  restoreBackup(createBackup());
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: PLAYER_STORAGE_KEY,
      oldValue: ordinary,
      newValue: localStorage.getItem(PLAYER_STORAGE_KEY),
      storageArea: localStorage,
    }),
  );
  expect(onRestore).toHaveBeenCalledOnce();
  stop();
});

it('does not save a stale round again while the tab unloads after restore', () => {
  const backup = createBackup();
  restoreBackup(backup);
  writeActiveGame({
    answers: [],
    contentVersion: 8,
    elapsedMilliseconds: 100,
    mode: { kind: 'training' },
    modifiers: defaultModifiers,
    questionCount: 10,
    questions: buildQuestions(
      catalog,
      defaultModifiers,
      createSeededRandom('saved-round'),
    ),
    seed: 'stale',
    playerRestoreId: null,
  });
  expect(sessionStorage.getItem('quizmon.active-game.v1')).toBeNull();
});

it('keeps the published version 1 fixture readable without losing fields', () => {
  const backup = parseBackup(JSON.stringify(v1Fixture));
  expect(backup.save.version).toBe(4);
  expect(backup.save.data).toEqual({
    ...v1Fixture.save.data,
    results: {
      ...v1Fixture.save.data.results,
      progress: {
        ...v1Fixture.save.data.results.progress,
        quickAttackRounds: 1,
      },
    },
    questionHistory: emptyQuestionHistory(),
    leagueLineup: v1Fixture.save.data.results.league.seed
      ? {
          seed: v1Fixture.save.data.results.league.seed,
          contentVersion: 0,
          questions: [],
        }
      : null,
    hallOfFame: [],
    pokedex: v1Fixture.save.data.results.progress.correctPokemon,
  });
  restoreBackup(backup);
  expect(readPlayerSave().data).toEqual(backup.save.data);
});

it('does not bypass the Generation roundup settings requirement during restore', () => {
  const backup = createBackup();
  backup.save.data.settings = {
    ...defaultModifiers,
    trainingMode: 'custom',
    generations: ['II'],
    questionTypes: ['generation-roundup'],
  };
  const before = localStorage.getItem(PLAYER_STORAGE_KEY);
  expect(() => restoreBackup(backup)).toThrow('fewer than two generations');
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(before);
});

it.each([
  { category: 'identity', correct: true, points: 1000 },
  { category: 'cry', correct: false, points: 0 },
  { category: 'scale', correct: true, points: 1000 },
  {
    category: 'evolution',
    correct: true,
    points: 1000,
    questionType: 'evolution-trail',
  },
  { ...result.answers[0], pokemonName: undefined, questionType: 'battle-view' },
  { ...result.answers[0], questionType: 'evolution-order' },
])('migrates historical answers without inventing metadata (%#)', (answer) => {
  populate();
  const original = readPlayerSave().data;
  const historical = { ...result, answers: [answer], scoreVersion: undefined };
  const results = { ...original.results, daily: { '2026-09-07': historical } };
  localStorage.clear();
  localStorage.setItem('quizmon.results.v2', JSON.stringify(results));
  localStorage.setItem(
    'quizmon.trainer-profile.v1',
    JSON.stringify(original.profile),
  );
  const migrated = readPlayerSave();
  expect(migrated.data.results).toEqual(results);
  expect(migrated.data.profile).toEqual(original.profile);
  expect(canPersistPlayerData()).toBe(true);
  expect(
    saveResult({ kind: 'daily', date: '2026-09-08' }, result).isSaved,
  ).toBe(true);
  const backup = parseBackup(JSON.stringify(createBackup()));
  restoreBackup(backup);
  expect(readDailyResult('2026-09-07')).toEqual(historical);
  expect(readPlayerSave().data.results.progress.correctPokemon).toEqual(
    original.results.progress.correctPokemon,
  );
});

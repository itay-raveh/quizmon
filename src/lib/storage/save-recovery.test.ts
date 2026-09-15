import { SAVE_SCHEMA_VERSION } from '../../domain/player/player-save';
import {
  createPlayerSave,
  readPlayerSave,
  updatePlayerData,
  PLAYER_STORAGE_KEY,
} from './player-storage';
import {
  createRecoveryExport,
  inspectSavedData,
  resetSavedData,
} from './save-recovery';
import { getSaveIssue } from './save-health';
import { ACTIVE_GAME_KEY, DAILY_ATTEMPTS_KEY } from './active-game-storage';
import { createBackup, restoreBackup } from '../../features/settings/backup';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());
it.each([1, 2, 3, 4, 5, 8])(
  'preserves rejected version %i byte for byte and blocks ordinary writes',
  (version) => {
    const raw = JSON.stringify({ ...createPlayerSave(), version }, null, 3);
    localStorage.setItem(PLAYER_STORAGE_KEY, raw);
    inspectSavedData();
    expect(getSaveIssue()?.kind).toBe(version > 7 ? 'newer' : 'unsupported');
    expect(updatePlayerData({ generationPromptAnswered: true })).toBe(false);
    expect(createRecoveryExport().entries).toContainEqual({
      storage: 'localStorage',
      key: PLAYER_STORAGE_KEY,
      raw,
    });
    expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(raw);
  },
);
it('exports invalid JSON and retired keys without requiring a valid player save', () => {
  localStorage.setItem(PLAYER_STORAGE_KEY, ' {broken\n');
  localStorage.setItem('quizmon.results.v2', 'old bytes');
  sessionStorage.setItem(ACTIVE_GAME_KEY, 'unfinished bytes');
  localStorage.setItem('unrelated', 'private');
  inspectSavedData();
  expect(getSaveIssue()?.kind).toBe('invalid');
  const exported = JSON.parse(
    JSON.stringify(createRecoveryExport()),
  ) as ReturnType<typeof createRecoveryExport>;
  expect(exported.entries.map(({ raw }) => raw)).toEqual([
    ' {broken\n',
    'old bytes',
    'unfinished bytes',
  ]);
  expect(JSON.stringify(exported)).not.toContain('private');
});
it('detects retired standalone settings even when no player document exists', () => {
  localStorage.setItem('quizmon.training-settings.v2', '{}');
  expect(() => readPlayerSave()).toThrow(
    expect.objectContaining({ kind: 'unsupported' }),
  );
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBeNull();
});
it.each([
  ['sessionStorage', ACTIVE_GAME_KEY, '{'],
  ['sessionStorage', ACTIVE_GAME_KEY, '{"version":2}'],
  ['localStorage', DAILY_ATTEMPTS_KEY, '[]'],
  [
    'localStorage',
    DAILY_ATTEMPTS_KEY,
    JSON.stringify({ attempt: { version: SAVE_SCHEMA_VERSION } }),
  ],
])('detects invalid or retired rounds in %s', (storage, key, raw) => {
  window[storage as 'localStorage' | 'sessionStorage'].setItem(key, raw);
  inspectSavedData();
  expect(getSaveIssue()).not.toBeNull();
  expect(
    window[storage as 'localStorage' | 'sessionStorage'].getItem(key),
  ).toBe(raw);
});
it('only clears saved gameplay data after a successful reset write', () => {
  localStorage.setItem(PLAYER_STORAGE_KEY, '{');
  localStorage.setItem('quizmon.results.v2', '{}');
  sessionStorage.setItem(ACTIVE_GAME_KEY, '{');
  localStorage.setItem('quizmon.daily-reminder-subscription.v1', 'keep');
  inspectSavedData();
  const write = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
  expect(() => resetSavedData()).toThrow();
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe('{');
  expect(sessionStorage.getItem(ACTIVE_GAME_KEY)).toBe('{');
  write.mockRestore();
  resetSavedData();
  expect(readPlayerSave().version).toBe(7);
  expect(readPlayerSave().restoreId).not.toBeNull();
  expect(localStorage.getItem('quizmon.results.v2')).toBeNull();
  expect(sessionStorage.getItem(ACTIVE_GAME_KEY)).toBeNull();
  expect(localStorage.getItem('quizmon.daily-reminder-subscription.v1')).toBe(
    'keep',
  );
  expect(getSaveIssue()).toBeNull();
});
it('can replace a damaged save with a validated current backup', () => {
  const backup = createBackup();
  backup.save.data.pokedex = ['pikachu'];
  localStorage.setItem(PLAYER_STORAGE_KEY, '{');
  inspectSavedData();
  restoreBackup(backup);
  expect(getSaveIssue()).toBeNull();
  expect(readPlayerSave().data.pokedex).toEqual(['pikachu']);
});
it('reports unavailable storage separately from corrupted data', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  inspectSavedData();
  expect(getSaveIssue()?.kind).toBe('unavailable');
});

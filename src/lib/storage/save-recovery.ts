import {
  PLAYER_SAVE_VERSION,
  parsePlayerSave,
} from '../../domain/player/player-save';
import { SaveError } from '../../domain/player/save-schema';
import { removeStoredValue } from './browser-storage';
import { isRecord } from '../validation';
import {
  ACTIVE_GAME_KEY,
  DAILY_ATTEMPTS_KEY,
  inspectRoundStorage,
} from './active-game-storage';
import {
  PLAYER_STORAGE_KEY,
  createPlayerSave,
  readPlayerSave,
  retiredPlayerKeys,
} from './player-storage';
import { clearSaveIssue, reportSaveIssue } from './save-health';

const recoveryKeys = {
  localStorage: [
    PLAYER_STORAGE_KEY,
    ...Object.values(retiredPlayerKeys),
    DAILY_ATTEMPTS_KEY,
  ],
  sessionStorage: [ACTIVE_GAME_KEY, 'quizmon.update-state.v1'],
} as const;

export const inspectSavedData = (): void => {
  try {
    readPlayerSave();
    inspectRoundStorage();
    const update = window.sessionStorage.getItem('quizmon.update-state.v1');
    if (update !== null) {
      const value: unknown = JSON.parse(update);
      if (!isRecord(value))
        throw new SaveError('invalid', 'The saved app session is invalid.');
      if (value.saveVersion !== PLAYER_SAVE_VERSION)
        throw new SaveError(
          Number(value.saveVersion) > PLAYER_SAVE_VERSION
            ? 'newer'
            : 'unsupported',
          'The saved app session uses a different format.',
        );
      if (!isRecord(value.values) || typeof value.url !== 'string')
        throw new SaveError('invalid', 'The saved app session is invalid.');
    }
  } catch (error) {
    reportSaveIssue(error);
  }
};

export const createRecoveryExport = () => ({
  format: 'quizmon-recovery',
  version: 1,
  exportedAt: new Date().toISOString(),
  entries: Object.entries(recoveryKeys).flatMap(([storage, keys]) =>
    keys.flatMap((key) => {
      const raw = window[storage as keyof typeof recoveryKeys].getItem(key);
      return raw === null ? [] : [{ storage, key, raw }];
    }),
  ),
});

export const clearRetiredAndRoundData = (): void => {
  for (const [storage, keys] of Object.entries(recoveryKeys))
    for (const key of keys)
      if (key !== PLAYER_STORAGE_KEY)
        removeStoredValue(storage as keyof typeof recoveryKeys, key);
};

export const resetSavedData = (): void => {
  const save = parsePlayerSave({
    ...createPlayerSave(),
    restoreId: crypto.randomUUID(),
  });
  window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(save));
  clearRetiredAndRoundData();
  clearSaveIssue();
};

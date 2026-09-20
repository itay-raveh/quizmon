import { localTables, type LocalRow } from './local-database';
import {
  SAVE_SCHEMA_VERSION,
  parsePlayerSave,
} from '../../domain/player/player-save';
import { removeStoredValue } from './browser-storage';
import { parseUpdateSave } from '../../domain/player/update-save';
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
  recoveryDatabase,
  recoverPlayer,
  canRecoverGuestSave,
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
    if (update !== null) parseUpdateSave(JSON.parse(update));
  } catch (error) {
    reportSaveIssue(error);
  }
};

export const createRecoveryExport = async () => ({
  format: 'quizmon-recovery',
  version: SAVE_SCHEMA_VERSION,
  exportedAt: new Date().toISOString(),
  database: await recoveryDatabase().readTransaction(async (transaction) =>
    Object.fromEntries(
      await Promise.all(
        [
          ...localTables,
          ...(!canRecoverGuestSave() ? ['pending_actions'] : []),
        ].map(
          async (table) =>
            [
              table,
              await transaction.getAll<LocalRow>(
                `SELECT id,payload FROM ${table}`,
              ),
            ] as const,
        ),
      ),
    ),
  ),
  entries: Object.entries(recoveryKeys).flatMap(([storage, keys]) =>
    keys.flatMap((key) => {
      const raw = window[storage as keyof typeof recoveryKeys].getItem(key);
      return raw === null ? [] : [{ storage, key, raw }];
    }),
  ),
});

const clearRetiredAndRoundData = (): void => {
  for (const [storage, keys] of Object.entries(recoveryKeys))
    for (const key of keys)
      if (key !== PLAYER_STORAGE_KEY)
        removeStoredValue(storage as keyof typeof recoveryKeys, key);
};

export const resetSavedData = async (): Promise<void> => {
  const save = parsePlayerSave({
    ...createPlayerSave(),
    restoreId: crypto.randomUUID(),
  });
  await recoverPlayer(async (state, transaction) => {
    for (const table of localTables)
      await transaction.execute(`DELETE FROM ${table}`);
    state.save = save;
  });
  clearRetiredAndRoundData();
  removeStoredValue('localStorage', PLAYER_STORAGE_KEY);
  clearSaveIssue();
};

import { localTables } from './local-database';
import {
  SAVE_SCHEMA_VERSION,
  parsePlayerSave,
} from '../../domain/player/player-save';
import { removeStoredValue } from './browser-storage';
import { parseUpdateSave } from '../../domain/player/update-save';
import { inspectRoundStorage } from './active-game-storage';
import {
  createPlayerSave,
  readPlayerSave,
  recoveryDatabase,
  recoverPlayer,
  canRecoverGuestSave,
} from './player-storage';
import { clearSaveIssue, reportSaveIssue } from './save-health';

const recoveryKeys = {
  sessionStorage: ['quizmon.baseline.update-state'],
} as const;

export const inspectSavedData = (): void => {
  try {
    readPlayerSave();
    inspectRoundStorage();
    const update = window.sessionStorage.getItem(
      'quizmon.baseline.update-state',
    );
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
          ...(!canRecoverGuestSave()
            ? ['pending_actions', 'player', 'round']
            : []),
        ].map(
          async (table) =>
            [
              table,
              await transaction.getAll(`SELECT * FROM ${table}`),
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

const clearUpdateState = (): void => {
  for (const [storage, keys] of Object.entries(recoveryKeys))
    for (const key of keys)
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
  clearUpdateState();
  clearSaveIssue();
};

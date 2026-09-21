import { SAVE_SCHEMA_VERSION } from '../../src/domain/player/player-save';
import { emptyPlayerData } from '../../src/domain/player/player-save';
import { createTrainerProfile } from '../../src/domain/player/trainer-profile';
import { parsePlayerSave } from '../../src/domain/player/player-save';
import { SaveError } from '../../src/domain/player/save-schema';
import { PLAYER_STORAGE_KEY } from '../../src/lib/storage/storage-keys';
import { localTables } from '../../src/lib/storage/local-database';
import {
  getPlayerDatabase,
  initializePlayerStorage,
  transactPlayer,
} from '../../src/lib/storage/player-storage';
import { applyResult } from '../../src/lib/storage/results-storage';
import { initializeLocalRound } from '../../src/lib/storage/round-storage';

export const resetLocalSave = async () => {
  await initializePlayerStorage();
  await transactPlayer(async (state, transaction) => {
    for (const table of localTables)
      if (table !== 'local_state')
        await transaction.execute(`DELETE FROM ${table}`);
    state.datasetId = crypto.randomUUID();
    state.predecessors = {};
    state.dailyAttempts = {};
    state.save = {
      version: SAVE_SCHEMA_VERSION,
      restoreId: null,
      data: { ...emptyPlayerData(), profile: createTrainerProfile() },
    };
  });
  await initializeLocalRound();
};
export const seedStoredFixture = () =>
  transactPlayer((state) => {
    state.save = readFixtureSave();
  });
export const saveResult = (
  ...args: Parameters<typeof applyResult> extends [unknown, ...infer Rest]
    ? Rest
    : never
) => transactPlayer((state) => applyResult(state.save.data, ...args));
export const seedActiveFixture = async (value: unknown) => {
  await initializeLocalRound();
  await getPlayerDatabase().execute(
    'INSERT OR REPLACE INTO local_rounds(id,payload) VALUES (?,?)',
    [sessionStorage.getItem('quizmon.baseline.tab'), JSON.stringify(value)],
  );
  await initializeLocalRound();
};

const readFixtureSave = () => {
  const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
  if (raw === null)
    throw new SaveError(
      'invalid',
      'This test fixture is missing its saved data.',
    );
  return parsePlayerSave(JSON.parse(raw));
};

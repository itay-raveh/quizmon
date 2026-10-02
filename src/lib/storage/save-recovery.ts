import { parseUpdateSave } from '../../domain/player/update-save';
import { removeStoredValue } from './browser-storage';
import {
  canRecoverGuestSave,
  currentOwnerId,
  readPlayerSave,
  recoveryDatabase,
  refreshPlayerData,
} from './player-storage';
import { clearSaveIssue, reportSaveIssue } from './save-health';
import { ensureDeviceState } from './rxdb-game';

export const inspectSavedData = (): void => {
  try {
    readPlayerSave();
    const update = window.sessionStorage.getItem(
      'quizmon.baseline.update-state',
    );
    if (update !== null) parseUpdateSave(JSON.parse(update));
  } catch (error) {
    reportSaveIssue(error);
  }
};

export const createRecoveryExport = async () => {
  const db = recoveryDatabase();
  const [players, rounds, device] = await Promise.all([
    db.players.find().exec(),
    db.rounds.find().exec(),
    db.device.find().exec(),
  ]);
  return {
    format: 'quizmon-recovery',
    exportedAt: new Date().toISOString(),
    ownerId: currentOwnerId(),
    players: players.map((doc) => doc.toMutableJSON()),
    rounds: rounds.map((doc) => doc.toMutableJSON()),
    device: device.map((doc) => doc.toMutableJSON()),
    updateState: window.sessionStorage.getItem('quizmon.baseline.update-state'),
  };
};

export const resetSavedData = async (): Promise<void> => {
  if (!canRecoverGuestSave())
    throw new Error('Account progress cannot be reset here.');
  const db = recoveryDatabase();
  for (const collection of [db.players, db.rounds, db.device])
    for (const doc of await collection.find().exec()) await doc.remove();
  await ensureDeviceState(db);
  removeStoredValue('sessionStorage', 'quizmon.baseline.update-state');
  await refreshPlayerData();
  clearSaveIssue();
};

import { clearActiveGame } from './active-game';
import { parsePlayerSave, type PlayerSave } from './player-data';
import { PLAYER_STORAGE_KEY, readPlayerSave } from './player-storage';
import { isRecord, isUtcTimestamp } from './validation';

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export interface PlayerBackup {
  exportedAt: string;
  format: 'quizmon-backup';
  save: PlayerSave;
  version: 1;
}

export const createBackup = (): PlayerBackup => ({
  exportedAt: new Date().toISOString(),
  format: 'quizmon-backup',
  save: readPlayerSave(),
  version: 1,
});

export const parseBackup = (text: string): PlayerBackup => {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) {
    throw new Error(
      'This file is too large. Choose a Quizmon backup under 10 MB.',
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON. Choose a Quizmon backup.');
  }
  if (!isRecord(value) || value.format !== 'quizmon-backup') {
    throw new Error(
      'This is not a Quizmon backup. Choose a file exported from Quizmon.',
    );
  }
  if (value.version !== 1) {
    throw new Error(
      'This backup uses an unsupported version. Update Quizmon or choose another backup.',
    );
  }
  if (!isUtcTimestamp(value.exportedAt)) {
    throw new Error('This backup has an invalid date. Choose another backup.');
  }
  const save = parsePlayerSave(value.save);
  const settings = save.data.settings;
  if (
    settings?.trainingMode === 'custom' &&
    settings.questionTypes.includes('generation-roundup') &&
    new Set(settings.generations).size < 2
  ) {
    throw new Error(
      'This backup selects Generation roundup with fewer than two generations. Fix and export the settings on the original device, then try again.',
    );
  }
  return {
    exportedAt: value.exportedAt,
    format: 'quizmon-backup',
    save,
    version: 1,
  };
};

export const restoreBackup = (backup: PlayerBackup): void => {
  const validated = parseBackup(JSON.stringify(backup));
  const save: PlayerSave = {
    ...validated.save,
    restoreId: crypto.randomUUID(),
  };
  try {
    window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(save));
  } catch {
    throw new Error(
      'Your browser could not save this backup. Free some storage or allow site storage, then try again. Your saved progress has not changed.',
    );
  }
  clearActiveGame();
};

export const downloadBackup = (): void => {
  const backup = createBackup();
  const trainerName = (backup.save.data.profile?.name ?? '')
    .replace(/[<>:"/\\|?*\p{Cc}\p{Cf}\s]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  const blob = new Blob([JSON.stringify(backup)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `quizmon-backup-${trainerName ? `${trainerName}-` : ''}${backup.exportedAt.slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

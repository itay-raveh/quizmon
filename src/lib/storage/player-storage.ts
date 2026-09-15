import {
  emptyPlayerData,
  parsePlayerSave,
  type PlayerData,
  type PlayerSave,
  SAVE_SCHEMA_VERSION,
} from '../../domain/player/player-save';
import { isRecord } from '../validation';
import { SaveError } from '../../domain/player/save-schema';
import { getSaveIssue, reportSaveIssue } from './save-health';

export const PLAYER_STORAGE_KEY = 'quizmon.player';
export const retiredPlayerKeys = {
  results: 'quizmon.results.v2',
  profile: 'quizmon.trainer-profile.v1',
  settings: 'quizmon.training-settings.v2',
  generationPromptAnswered: 'quizmon.generation-prompt.v1',
} as const;

export const createPlayerSave = (): PlayerSave => ({
  data: emptyPlayerData(),
  restoreId: null,
  version: SAVE_SCHEMA_VERSION,
});

export const readPlayerSave = (): PlayerSave => {
  try {
    const raw = window.localStorage.getItem(PLAYER_STORAGE_KEY);
    if (raw !== null) {
      const stored: unknown = JSON.parse(raw);
      const save = parsePlayerSave(stored);
      if (
        isRecord(stored) &&
        stored.version !== save.version &&
        !getSaveIssue()
      ) {
        try {
          window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(save));
        } catch {
          // A failed migration write must preserve the original document for recovery.
        }
      }
      return save;
    }
    if (
      Object.values(retiredPlayerKeys).some(
        (key) => window.localStorage.getItem(key) !== null,
      )
    )
      throw new SaveError(
        'unsupported',
        'This save uses a retired Quizmon format.',
      );
    return createPlayerSave();
  } catch (error) {
    throw reportSaveIssue(error);
  }
};

export const readPlayerData = (): PlayerData => {
  try {
    return readPlayerSave().data;
  } catch {
    return emptyPlayerData();
  }
};

export const updatePlayerData = (patch: Partial<PlayerData>): boolean => {
  if (getSaveIssue()) return false;
  try {
    const current = readPlayerSave();
    const next = parsePlayerSave({
      ...current,
      data: { ...current.data, ...patch },
    });
    window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
};

export const canPersistPlayerData = (): boolean => {
  if (getSaveIssue()) return false;
  try {
    const current = readPlayerSave();
    window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(current));
    return true;
  } catch {
    return false;
  }
};

export const subscribeToPlayerRestore = (
  onRestore: () => void,
): (() => void) => {
  const listener = (event: StorageEvent) => {
    if (
      event.key !== PLAYER_STORAGE_KEY ||
      event.storageArea !== window.localStorage ||
      !event.newValue
    )
      return;
    try {
      const next = parsePlayerSave(JSON.parse(event.newValue));
      const previous: unknown = event.oldValue
        ? JSON.parse(event.oldValue)
        : null;
      if (
        next.restoreId &&
        (!isRecord(previous) || next.restoreId !== previous.restoreId)
      )
        onRestore();
    } catch {
      // An older tab must stop writing when another version replaces its save.
      onRestore();
    }
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
};

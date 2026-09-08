import { isRecord } from './validation';
import { normalizeModifiers } from './modifiers';
import { normalizeTrainerProfile } from './profile-data';
import { normalizeResults } from './results-data';
import {
  emptyPlayerData,
  parsePlayerSave,
  type PlayerData,
  type PlayerSave,
  type PlayerSaveV1,
} from './player-data';

export const PLAYER_STORAGE_KEY = 'quizmon.player';
const legacyKeys = {
  results: 'quizmon.results.v2',
  profile: 'quizmon.trainer-profile.v1',
  settings: 'quizmon.training-settings.v2',
  generationPromptAnswered: 'quizmon.generation-prompt.v1',
} as const;

const readLegacyJson = (key: string): unknown => {
  const raw = window.localStorage.getItem(key);
  return raw === null ? null : (JSON.parse(raw) as unknown);
};

const migrateLegacySave = (): PlayerSaveV1 => {
  const settings = readLegacyJson(legacyKeys.settings);
  const results = readLegacyJson(legacyKeys.results);
  const profile = readLegacyJson(legacyKeys.profile);
  if (
    (results !== null && !isRecord(results)) ||
    (profile !== null && !normalizeTrainerProfile(profile)) ||
    (settings !== null && !isRecord(settings)) ||
    (isRecord(results) &&
      isRecord(results.progress) &&
      results.progress.version !== 2) ||
    (isRecord(results) &&
      isRecord(results.streak) &&
      results.streak.version !== 1)
  ) {
    throw new Error(
      'Existing saved data is damaged or uses an unsupported version. It has been left unchanged.',
    );
  }
  return {
    data: {
      generationPromptAnswered:
        window.localStorage.getItem(legacyKeys.generationPromptAnswered) ===
        '1',
      profile: normalizeTrainerProfile(profile),
      results: normalizeResults(results),
      settings: settings === null ? null : normalizeModifiers(settings),
    },
    restoreId: null,
    version: 1,
  };
};

export const readPlayerSave = (): PlayerSave => {
  const raw = window.localStorage.getItem(PLAYER_STORAGE_KEY);
  if (raw !== null) {
    const stored: unknown = JSON.parse(raw) as unknown;
    const save = parsePlayerSave(stored);
    if (isRecord(stored) && stored.version !== save.version) {
      try {
        window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(save));
      } catch {
        // Keep the previous version intact if the migrated document cannot be saved.
      }
    }
    return save;
  }
  const migrated = parsePlayerSave(migrateLegacySave());
  const concurrent = window.localStorage.getItem(PLAYER_STORAGE_KEY);
  if (concurrent !== null)
    return parsePlayerSave(JSON.parse(concurrent) as unknown);
  try {
    window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(migrated));
    for (const key of Object.values(legacyKeys))
      window.localStorage.removeItem(key);
  } catch {
    // A full store can still be read and exported without deleting the legacy save.
  }
  return migrated;
};

export const readPlayerData = (): PlayerData => {
  try {
    return readPlayerSave().data;
  } catch {
    return emptyPlayerData();
  }
};

export const updatePlayerData = (patch: Partial<PlayerData>): boolean => {
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
      const next = parsePlayerSave(JSON.parse(event.newValue) as unknown);
      const previous: unknown = event.oldValue
        ? (JSON.parse(event.oldValue) as unknown)
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

import { SaveError } from '../../domain/player/save-schema';
import {
  type PlayerData,
  type PlayerSave,
} from '../../domain/player/player-save';
import { trackFailure } from '../analytics';
import { captureUnexpectedError } from '../sentry';
import { getSaveIssue } from './save-health';
import { openPlayerDatabase, type PlayerDatabase } from './rxdb-database';
import {
  ensureDeviceState,
  readDeviceState,
  readGameData,
  writePlayerPreferences,
  type DeviceState,
} from './rxdb-game';

let database: PlayerDatabase | undefined;
let accountId: string | undefined;
let data: PlayerData | undefined;
let device: DeviceState | undefined;
let initialization: Promise<void> | undefined;
let saveError = '';
let retryWrite: (() => Promise<unknown>) | undefined;
let retrying = false;
const listeners = new Set<() => void>();
const restoreListeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const subscribeToPlayerChanges = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const subscribeToPlayerRestore = (listener: () => void) => {
  restoreListeners.add(listener);
  return () => {
    restoreListeners.delete(listener);
  };
};

export const getSaveError = () => saveError;
export const isSaveRetrying = () => retrying;
export const reportSaveError = (
  error: unknown,
  retry?: () => Promise<unknown>,
) => {
  trackFailure('save.write');
  if (!(error instanceof SaveError))
    captureUnexpectedError('save.write', error);
  saveError =
    error instanceof SaveError
      ? error.message
      : 'Your browser could not save your progress.';
  retryWrite = retry;
  emit();
};

export const retryPlayerSave = async () => {
  if (retrying) return;
  if (!retryWrite) {
    window.location.reload();
    return;
  }
  const retry = retryWrite;
  retrying = true;
  emit();
  try {
    await retry();
    saveError = '';
    retryWrite = undefined;
  } catch (error) {
    reportSaveError(error, retry);
  } finally {
    retrying = false;
    emit();
  }
};

export const currentOwnerId = () => accountId ?? 'guest';

export const playerDatabaseName = async (owner?: string) => {
  if (!owner) return 'quizmon_guest_v4';
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(owner)),
  );
  return `quizmon_account_v4_${Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};

export const getPlayerDatabase = (): PlayerDatabase => {
  if (!database || !data || !device)
    throw new Error('The local save is still opening.');
  return database;
};

export const recoveryDatabase = (): PlayerDatabase => {
  if (!database) throw new Error('Saved data is unavailable.');
  return database;
};

export const refreshPlayerData = async () => {
  if (!database) return;
  const next = await readGameData(database, currentOwnerId());
  const previousRestoreId = device?.restoreId;
  if (
    JSON.stringify(data) === JSON.stringify(next.data) &&
    JSON.stringify(device) === JSON.stringify(next.device)
  )
    return;
  data = next.data;
  device = next.device;
  emit();
  if (previousRestoreId !== undefined && previousRestoreId !== device.restoreId)
    restoreListeners.forEach((listener) => listener());
};

const refreshDeviceState = async () => {
  if (!database || !device) return;
  const previous = device;
  const next = await readDeviceState(database);
  device = next;
  if (
    previous.restoreId !== next.restoreId ||
    Object.keys(previous.dailyAttempts).length !==
      Object.keys(next.dailyAttempts).length ||
    Object.entries(next.dailyAttempts).some(
      ([date, round]) =>
        previous.dailyAttempts[date]?.roundId !== round.roundId ||
        previous.dailyAttempts[date]?.answers.length !== round.answers.length,
    )
  )
    emit();
  if (previous.restoreId !== next.restoreId)
    restoreListeners.forEach((listener) => listener());
};

export const initializePlayerStorage = (
  selectedAccount?: string,
): Promise<void> => {
  initialization ??= (async () => {
    if (selectedAccount && !/^[A-Za-z0-9_-]{1,128}$/.test(selectedAccount))
      throw new Error('The selected account identity is invalid.');
    accountId = selectedAccount;
    database = await openPlayerDatabase(
      await playerDatabaseName(selectedAccount),
    );
    await ensureDeviceState(database);
    await refreshPlayerData();
    const changed = () => {
      void refreshPlayerData().catch(reportSaveError);
    };
    database.players.$.subscribe(changed);
    database.rounds.$.subscribe(changed);
    database.device.$.subscribe(({ documentId }) => {
      if (documentId === 'state')
        void refreshDeviceState().catch(reportSaveError);
    });
  })();
  return initialization;
};

export const readPlayerSave = (): PlayerSave => {
  if (!data || !device) throw new Error('The local save is still opening.');
  return {
    restoreId: device.restoreId,
    data: structuredClone(data),
  };
};

export const readPlayerRestoreId = (): string | null => {
  if (!device) throw new Error('The local save is still opening.');
  return device.restoreId;
};

export const readPlayerData = (): PlayerData => readPlayerSave().data;
export const readLocalDailyAttempts = () =>
  structuredClone(device?.dailyAttempts ?? {});
export const canPersistPlayerData = () =>
  Boolean(database && data && device && !saveError && !getSaveIssue());

export const updatePlayerData = async (
  patch: Partial<PlayerData>,
): Promise<boolean> => {
  try {
    await writePlayerPreferences(getPlayerDatabase(), currentOwnerId(), {
      profile: patch.profile,
      settings: patch.settings,
    });
    await refreshPlayerData();
    return true;
  } catch (error) {
    reportSaveError(error, () => updatePlayerData(patch));
    return false;
  }
};

export const canRecoverGuestSave = () => !accountId;
export const canRecoverAccountSave = () => Boolean(accountId);

import { rebuildGuestProgress } from './game-history';
import { SaveError } from '../../domain/player/save-schema';
import { trackFailure } from '../analytics';
import { captureUnexpectedError } from '../sentry';
import { getSaveIssue, clearSaveIssue } from './save-health';
import { SAVE_SCHEMA_VERSION } from '../../domain/player/player-save';
import {
  emptyPlayerData,
  parsePlayerSave,
  type PlayerData,
  type PlayerSave,
} from '../../domain/player/player-save';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { trainingConfig } from '../../domain/sync/progress';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { isRecord, isUuid } from '../validation';
import { convertSavedDatabaseV1 } from './save-compatibility';
import {
  openLocalDatabase,
  type LocalRow,
  type LocalTransaction,
} from './local-database';

export interface LocalPlayerState {
  version: 2;
  dailyAttempts?: Record<string, unknown>;
  datasetId: string;
  save: PlayerSave;
  account?: { id: string; serverEpoch: string };
}
export type LocalAction = {
  id: string;
  datasetId: string;
  kind: 'round' | 'edit';
  payload: unknown;
};
let accountDatabase = false;
let database: ReturnType<typeof openLocalDatabase> | undefined;
let snapshot: LocalPlayerState | undefined;
let initialization: Promise<void> | undefined;
let saveError = '';
let retryWrite: (() => Promise<unknown>) | undefined;
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
export const reportSaveError = (
  error: unknown,
  retry?: () => Promise<unknown>,
) => {
  trackFailure('save.write');
  if (!(error instanceof SaveError))
    captureUnexpectedError('save.write', error);
  saveError =
    error instanceof Error
      ? error.message
      : 'Your browser could not save your progress.';
  retryWrite = retry;
  emit();
};
export const retryPlayerSave = async () => {
  if (!retryWrite) {
    window.location.reload();
    return;
  }
  const retry = retryWrite;
  saveError = '';
  retryWrite = undefined;
  emit();
  try {
    await retry();
  } catch (error) {
    reportSaveError(error, retry);
  }
};
export const parseLocalPlayerState = (value: unknown): LocalPlayerState => {
  if (
    isRecord(value) &&
    value.account !== undefined &&
    (!isRecord(value.account) ||
      typeof value.account.id !== 'string' ||
      !isUuid(value.account.serverEpoch))
  )
    throw new SaveError(
      'invalid',
      'This save has an invalid account identity.',
    );
  if (!isRecord(value) || value.version !== 2 || !isUuid(value.datasetId))
    throw new SaveError(
      isRecord(value) && typeof value.version === 'number' && value.version > 2
        ? 'newer'
        : 'invalid',
      'This local save is damaged or uses an unsupported version. It has been left unchanged.',
    );
  return {
    version: 2,
    datasetId: value.datasetId,
    save: parsePlayerSave(value.save),
    dailyAttempts: isRecord(value.dailyAttempts) ? value.dailyAttempts : {},
    ...(isRecord(value.account) &&
    typeof value.account.id === 'string' &&
    isUuid(value.account.serverEpoch)
      ? {
          account: {
            id: value.account.id,
            serverEpoch: value.account.serverEpoch,
          },
        }
      : {}),
  };
};
export const readState = async (transaction: LocalTransaction) => {
  const [row] = await transaction.getAll<LocalRow>(
    "SELECT id,payload FROM local_state WHERE id = 'player'",
  );
  if (!row)
    throw new Error(
      'The local save is missing. Reload Quizmon before continuing.',
    );
  return parseLocalPlayerState(JSON.parse(row.payload));
};
const writeState = (transaction: LocalTransaction, state: LocalPlayerState) =>
  transaction.execute(
    "INSERT OR REPLACE INTO local_state(id,payload) VALUES ('player',?)",
    [JSON.stringify(state)],
  );
const refresh = async () => {
  if (!database) return;
  const next = await readState(database);
  if (JSON.stringify(snapshot) === JSON.stringify(next)) return;
  const replaced = snapshot && snapshot.save.restoreId !== next.save.restoreId;
  snapshot = next;
  emit();
  if (replaced) restoreListeners.forEach((listener) => listener());
};
export const initializePlayerStorage = (accountId?: string): Promise<void> => {
  initialization ??= (async () => {
    accountDatabase = Boolean(accountId);
    database = openLocalDatabase(accountId);
    await database.init();
    await convertSavedDatabaseV1(database, accountId);
    const [stored] = await database.getAll<LocalRow>(
      "SELECT id,payload FROM local_state WHERE id = 'player'",
    );
    const parsed = stored && parseLocalPlayerState(JSON.parse(stored.payload));
    if (!parsed || JSON.stringify(parsed) !== stored.payload) {
      await database.writeTransaction(async (transaction) => {
        const rows = await transaction.getAll<LocalRow>(
          "SELECT id,payload FROM local_state WHERE id = 'player'",
        );
        if (rows.length) {
          const current = parseLocalPlayerState(JSON.parse(rows[0]!.payload));
          if (!current.account)
            await rebuildGuestProgress(current, transaction);
          if (JSON.stringify(current) !== rows[0]!.payload)
            await writeState(transaction, current);
          return;
        }
        await writeState(transaction, {
          version: 2,
          datasetId: crypto.randomUUID(),
          save: {
            version: SAVE_SCHEMA_VERSION,
            restoreId: null,
            data: { ...emptyPlayerData(), profile: createTrainerProfile() },
          },
        });
      });
    }
    await refresh();
    database.onChange(
      {
        onChange: () => {
          void refresh().catch(reportSaveError);
        },
      },
      { tables: ['local_state'] },
    );
  })();
  return initialization;
};
export const getPlayerDatabase = () => {
  if (!database || !snapshot)
    throw new Error('The local save is still opening.');
  return database;
};
export const readPlayerSave = (): PlayerSave => {
  if (!snapshot) throw new Error('The local save is still opening.');
  return structuredClone(snapshot.save);
};
export const readLocalDailyAttempts = () =>
  structuredClone(snapshot?.dailyAttempts ?? {});
export const readPlayerData = (): PlayerData => readPlayerSave().data;
export const canPersistPlayerData = () =>
  Boolean(snapshot && !saveError && !getSaveIssue());
export const transactPlayer = async <T>(
  callback: (
    state: LocalPlayerState,
    transaction: LocalTransaction,
  ) => T | Promise<T>,
): Promise<T> => {
  if (getSaveIssue())
    throw new Error('Recover your saved data before making changes.');
  const expectedRestore = readPlayerSave().restoreId;
  const write = () =>
    getPlayerDatabase().writeTransaction(async (transaction) => {
      const state = await readState(transaction);
      const [handoff] = await transaction.getAll<LocalRow>(
        "SELECT id,payload FROM local_state WHERE id = 'handoff'",
      );
      if (handoff)
        throw new Error(
          'This save is moving to an account. Finish signing in before continuing.',
        );
      if (state.save.restoreId !== expectedRestore)
        throw new Error(
          'Another tab restored a save. Reload this tab before continuing.',
        );
      const previous = JSON.stringify(state);
      const result = await callback(state, transaction);
      state.save = parsePlayerSave(state.save);
      if (JSON.stringify(state) !== previous)
        await writeState(transaction, state);
      return result;
    });
  const result = navigator.locks
    ? await navigator.locks.request('quizmon-account-handoff', write)
    : await write();
  await refresh();
  return result;
};
export const appendLocalAction = async (
  state: LocalPlayerState,
  transaction: LocalTransaction,
  kind: LocalAction['kind'],
  payload: unknown,
  operationId: string = crypto.randomUUID(),
) => {
  const action: LocalAction = {
    id: operationId,
    datasetId: state.datasetId,
    kind,
    payload,
  };
  await transaction.execute(
    'INSERT INTO local_actions(id,payload) VALUES (?,?)',
    [operationId, JSON.stringify(action)],
  );
  if (state.account)
    await transaction.execute(
      'INSERT INTO pending_actions(id,payload,sequence) VALUES (?,?,(SELECT COALESCE(MAX(sequence),0)+1 FROM pending_actions))',
      [operationId, JSON.stringify(action)],
    );
  return action;
};
const recordEdit = async (
  state: LocalPlayerState,
  transaction: LocalTransaction,
  unit:
    | 'avatar'
    | 'name'
    | 'partnerPokemon'
    | 'specialty'
    | 'answerFlow'
    | 'timerDisplay'
    | 'training',
  value: unknown,
) => {
  const id = crypto.randomUUID();
  const names: Partial<Record<typeof unit, string>> = {
    partnerPokemon: 'partner',
    answerFlow: 'answer_flow',
    timerDisplay: 'timer_display',
  };
  const name = names[unit] ?? unit;
  const normalized =
    unit === 'training' && value
      ? {
          training_mode: (value as ReturnType<typeof trainingConfig>)
            .trainingMode,
          difficulty:
            (value as ReturnType<typeof trainingConfig>).difficulty ??
            defaultGameSettings.difficulty,
          question_selection:
            (value as ReturnType<typeof trainingConfig>).questionSelection ??
            defaultGameSettings.questionSelection,
          generations: (value as ReturnType<typeof trainingConfig>).generations,
          form_groups:
            (value as ReturnType<typeof trainingConfig>).formGroups ??
            defaultGameSettings.formGroups,
          question_types: (value as ReturnType<typeof trainingConfig>)
            .questionTypes,
          auto_types:
            (value as ReturnType<typeof trainingConfig>)
              .automaticQuestionTypes ?? null,
        }
      : value;
  await appendLocalAction(
    state,
    transaction,
    'edit',
    { id, unit: name, value: normalized },
    id,
  );
};
export const updatePlayerData = async (
  patch: Partial<PlayerData>,
): Promise<boolean> => {
  const observed = readPlayerData();
  const requested = structuredClone(patch);
  const changedFields = <T extends object>(next: T, old: T | null) =>
    Object.fromEntries(
      Object.entries(next).filter(
        ([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(old && old[key as keyof T]),
      ),
    );
  try {
    await transactPlayer(async (state, transaction) => {
      const previous = state.save.data;
      const merged = { ...previous, ...requested };
      if (requested.profile && previous.profile)
        merged.profile = {
          ...previous.profile,
          ...changedFields(requested.profile, observed.profile),
        };
      if (requested.settings && previous.settings) {
        const changed = changedFields(requested.settings, observed.settings);
        merged.settings = {
          ...previous.settings,
          ...changed,
        };
        if (
          [
            'trainingMode',
            'generations',
            'questionTypes',
            'difficulty',
            'formGroups',
            'questionSelection',
            'automaticQuestionTypes',
          ].some((key) => Object.hasOwn(changed, key))
        )
          Object.assign(merged.settings, trainingConfig(requested.settings));
      }
      const next = parsePlayerSave({ ...state.save, data: merged }).data;
      for (const unit of [
        'avatar',
        'name',
        'partnerPokemon',
        'specialty',
      ] as const) {
        if (next.profile && next.profile[unit] !== previous.profile?.[unit])
          await recordEdit(state, transaction, unit, next.profile[unit]);
      }
      for (const unit of ['answerFlow', 'timerDisplay'] as const) {
        if (next.settings && next.settings[unit] !== previous.settings?.[unit])
          await recordEdit(state, transaction, unit, next.settings[unit]);
      }
      const training = (settings: PlayerData['settings']) =>
        settings && trainingConfig(settings);
      if (
        next.settings &&
        JSON.stringify(training(next.settings)) !==
          JSON.stringify(training(previous.settings))
      )
        await recordEdit(
          state,
          transaction,
          'training',
          training(next.settings),
        );
      next.pokedex = previous.pokedex;
      state.save.data = next;
    });
    return true;
  } catch (error) {
    reportSaveError(error, () => updatePlayerData(patch));
    return false;
  }
};

export const createPlayerSave = (): PlayerSave => ({
  data: emptyPlayerData(),
  restoreId: null,
  version: SAVE_SCHEMA_VERSION,
});

export const canRecoverGuestSave = () => !accountDatabase && !snapshot?.account;
export const recoveryDatabase = () => {
  if (!database) throw new Error('Saved data is unavailable.');
  return database;
};
export const recoverPlayer = async <T>(
  callback: (
    state: LocalPlayerState,
    transaction: LocalTransaction,
  ) => Promise<T>,
): Promise<T> => {
  if (!canRecoverGuestSave())
    throw new Error('Account progress cannot be reset or replaced.');
  const write = () =>
    recoveryDatabase().writeTransaction(async (transaction) => {
      const [handoff] = await transaction.getAll<LocalRow>(
        "SELECT id,payload FROM local_state WHERE id = 'handoff'",
      );
      if (handoff)
        throw new Error('Finish signing in before restoring this save.');
      const state: LocalPlayerState = {
        version: 2,
        datasetId: crypto.randomUUID(),
        dailyAttempts: {},
        save: createPlayerSave(),
      };
      const result = await callback(state, transaction);
      state.save = parsePlayerSave(state.save);
      await writeState(transaction, state);
      return result;
    });
  const result = navigator.locks
    ? await navigator.locks.request('quizmon-account-handoff', write)
    : await write();
  clearSaveIssue();
  saveError = '';
  retryWrite = undefined;
  await refresh();
  return result;
};

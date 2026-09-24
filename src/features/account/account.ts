import { SAVE_SCHEMA_VERSION } from '../../domain/player/player-save';
import { parseActiveGameSave } from '../../domain/player/active-game';
import {
  UpdateType,
  type PowerSyncBackendConnector,
  type PowerSyncDatabase,
} from '@powersync/web';
import { emailOTPClient, jwtClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { emptyPlayerData } from '../../domain/player/player-save';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { accountReturnPath } from './account-navigation';
import { hash } from '../../domain/sync/progress';
import { projectAccount } from '../../lib/storage/account-projection';
import {
  queueIssueResolution,
  readAccountIssues,
  type AccountIssue,
} from '../../lib/storage/account-issues';
import {
  localTables,
  openLocalDatabase,
  type LocalRow,
} from '../../lib/storage/local-database';
import {
  getPlayerDatabase,
  parseLocalPlayerState,
  readState,
  transactPlayer,
  type LocalAction,
} from '../../lib/storage/player-storage';
import { isRecord } from '../../lib/validation';
import { readSyncConnection } from '../../domain/sync/connection';
import { clearSentryUser, setVerifiedSentryUser } from '../../lib/sentry';
import { writeStoredValue } from '../../lib/storage/browser-storage';
import { convertSavedDatabaseV1 } from '../../lib/storage/save-compatibility';

const selectionKey = 'quizmon.baseline.account';
export const accountWelcomeKey = 'quizmon.baseline.account-welcome';
export const reconnectMessage =
  'Account data changed. Reconnect this device to resume syncing.';
const auth = createAuthClient({ plugins: [emailOTPClient(), jwtClient()] });
type Binding = { id: string; serverEpoch: string };
let account: PowerSyncDatabase | undefined;
let binding: Binding | undefined;
let candidate: Binding | undefined;
let snapshot = {
  owner: '',
  status: 'Saved on this device',
  error: '',
  diagnostic: '',
  pending: 0,
  mergeRequired: false,
  emailDelivery: '',
  issues: [] as AccountIssue[],
};
const listeners = new Set<() => void>();
const update = (patch: Partial<typeof snapshot>) => {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
};
const syncDiagnostic = (phase: string, error: Error) =>
  [
    phase,
    `${error.name}: ${error.message}`,
    error.stack,
    error.cause instanceof Error &&
      `Cause: ${error.cause.stack ?? error.cause.message}`,
  ]
    .filter(Boolean)
    .join('\n');
export const accountSnapshot = () => snapshot;
export const subscribeAccount = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const selectedAccount = () =>
  localStorage.getItem(selectionKey) ?? undefined;
const refreshSentryIdentity = async () => {
  const version = clearSentryUser();
  const selected = selectedAccount();
  if (!selected || localStorage.getItem('quizmon.baseline.revocation-pending'))
    return;
  const { data } = await auth.getSession();
  if (data?.user.id === selected && data.user.email)
    await setVerifiedSentryUser(data.user.id, data.user.email, version);
};
export async function accountRequest(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15_000),
  });
  const value: unknown = await response.json().catch(() => {
    if (response.ok)
      throw new Error(
        'The account service returned an unreadable response. Try again.',
      );
    return null;
  });
  if (response.status === 401) clearSentryUser();
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'Sign in to the same account to resume syncing.'
        : isRecord(value) && typeof value.error === 'string'
          ? value.error
          : `Sync is unavailable (${response.status}).`,
    );
  return value;
}
const parseBinding = (value: unknown): Binding => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.serverEpoch !== 'string'
  )
    throw new Error('The account service returned an invalid save identity.');
  return {
    id: value.id,
    serverEpoch: value.serverEpoch,
  };
};
async function revokePendingSession() {
  if (!localStorage.getItem('quizmon.baseline.revocation-pending')) return;
  const { error } = await auth.signOut();
  if (error)
    throw new Error(
      'Reconnect to finish signing out before starting another session.',
    );
  localStorage.removeItem('quizmon.baseline.revocation-pending');
}
export async function sendSignInCode(email: string) {
  await revokePendingSession();
  const result = await auth.emailOtp.sendVerificationOtp({
    email,
    type: 'sign-in',
  });
  if (result.error)
    throw new Error(result.error.message ?? 'The code could not be sent.');
}
export async function verifySignInCode(email: string, otp: string) {
  clearSentryUser();
  const result = await auth.signIn.emailOtp({ email, otp });
  if (result.error)
    throw new Error(result.error.message ?? 'Check your code and try again.');
  await continueSignIn();
}
export async function continueSignIn() {
  candidate = parseBinding(await accountRequest('/api/account'));
  if (selectedAccount() === candidate.id) {
    const saved = await readState(getPlayerDatabase());
    if (saved.account?.serverEpoch !== candidate.serverEpoch) {
      const [cutover] = await getPlayerDatabase().getAll<LocalRow>(
        "SELECT id,payload FROM local_state WHERE id = 'cutover-rebind'",
      );
      if (saved.account && !cutover) {
        window.location.reload();
        return;
      }
      await finishSignIn(false, true);
      return;
    }
    if (!writeStoredValue('sessionStorage', accountWelcomeKey, candidate.id))
      window.history.replaceState(
        null,
        '',
        accountReturnPath(window.location.href),
      );
    window.location.reload();
    return;
  }
  await finishSignIn(false);
}
export async function finishSignIn(merge: boolean, useAccountOnly = false) {
  if (!candidate)
    candidate = parseBinding(await accountRequest('/api/account'));
  const destination = candidate;
  await navigator.locks.request('quizmon-account-handoff', async () => {
    const guest = openLocalDatabase();
    const target = openLocalDatabase(destination.id);
    try {
      await guest.init();
      await target.init();
      await convertSavedDatabaseV1(guest);
      await convertSavedDatabaseV1(target, destination.id);
      let source = await readState(guest);
      const [handoff] = await guest.getAll<LocalRow>(
        "SELECT id,payload FROM local_state WHERE id = 'handoff'",
      );
      if (
        handoff &&
        JSON.stringify(parseBinding(JSON.parse(handoff.payload))) !==
          JSON.stringify(destination)
      ) {
        if (!useAccountOnly)
          throw new Error(
            'This browser save is already transferring to another account. Choose Use account progress to keep it separate.',
          );
      }
      const actions = await guest.getAll<LocalRow>(
        'SELECT id,payload FROM local_actions',
      );
      const guestRounds = await guest.getAll<LocalRow>(
        'SELECT id,payload FROM local_rounds',
      );
      const hasGuest =
        actions.length > 0 ||
        guestRounds.length > 0 ||
        Object.keys(source.dailyAttempts ?? {}).length > 0;
      if (hasGuest && !useAccountOnly) {
        const linked = await accountRequest('/api/account/link', {
          expectedAccountId: destination.id,
          ...destination,
          datasetId: source.datasetId,
          linkId: source.datasetId,
          profileCreatedAt: source.save.data.profile?.createdAt,
          merge,
        });
        if (!isRecord(linked) || linked.linked !== true) {
          update({ mergeRequired: true });
          return;
        }
        await guest.writeTransaction(async (tx) => {
          source = await readState(tx);
          await tx.execute(
            "INSERT OR REPLACE INTO local_state(id,payload) VALUES ('handoff',?)",
            [JSON.stringify(destination)],
          );
        });
      }
      let targetState = await target.readTransaction(async (tx) => {
        const [row] = await tx.getAll<LocalRow>(
          "SELECT id,payload FROM local_state WHERE id = 'player'",
        );
        return row ? parseLocalPlayerState(JSON.parse(row.payload)) : null;
      });
      if (targetState?.account && targetState.account.id !== destination.id)
        throw new Error(
          'This account history has changed. Your existing local save has been preserved.',
        );
      if (
        targetState?.account &&
        targetState.account.serverEpoch !== destination.serverEpoch
      ) {
        const [cutover] = await target.getAll<LocalRow>(
          "SELECT id,payload FROM local_state WHERE id = 'cutover-rebind'",
        );
        if (!cutover)
          throw new Error(
            'This database instance changed. Your pending changes remain on this device. Download a backup before reconnecting.',
          );
      }
      targetState ??= {
        version: 2,
        datasetId: crypto.randomUUID(),
        account: destination,
        save: {
          version: SAVE_SCHEMA_VERSION,
          restoreId: crypto.randomUUID(),
          data: { ...emptyPlayerData(), profile: createTrainerProfile() },
        },
      };
      targetState.account = destination;
      await accountRequest('/api/account/link', {
        expectedAccountId: destination.id,
        ...destination,
        datasetId: targetState.datasetId,
        linkId: targetState.datasetId,
        merge: true,
      });
      const finalState = targetState;
      await target.writeTransaction(async (tx) => {
        if (hasGuest && !useAccountOnly) {
          for (const row of await guest.getAll<LocalRow>(
            'SELECT id,payload FROM local_actions ORDER BY rowid',
          )) {
            const action = JSON.parse(row.payload) as LocalAction;
            if (
              action.id !== row.id ||
              !['round', 'edit'].includes(action.kind)
            )
              throw new Error(
                'A browser change could not be read. Download a backup before retrying.',
              );
            const [existing] = await tx.getAll<LocalRow>(
              'SELECT id,payload FROM local_actions WHERE id = ?',
              [row.id],
            );
            if (existing) {
              if (existing.payload !== JSON.stringify(action))
                throw new Error(
                  'This save contains conflicting change identities.',
                );
              continue;
            }
            await tx.execute(
              'INSERT INTO local_actions(id,payload) VALUES (?,?)',
              [row.id, JSON.stringify(action)],
            );
            await tx.execute(
              'INSERT INTO pending_actions(id,payload,sequence) VALUES (?,?,(SELECT COALESCE(MAX(sequence),0)+1 FROM pending_actions))',
              [row.id, JSON.stringify(action)],
            );
          }
          for (const row of await guest.getAll<LocalRow>(
            'SELECT id,payload FROM local_completions',
          ))
            await tx.execute(
              'INSERT OR IGNORE INTO local_completions(id,payload) VALUES (?,?)',
              [row.id, row.payload],
            );
          for (const row of guestRounds) {
            const round = parseActiveGameSave(JSON.parse(row.payload));
            if (round.completedAt) {
              const [completion] = await guest.getAll<LocalRow>(
                'SELECT id,payload FROM local_completions WHERE id = ?',
                [round.roundId],
              );
              if (completion) continue;
            }
            const [existing] = await tx.getAll<LocalRow>(
              'SELECT id,payload FROM local_rounds WHERE id = ?',
              [row.id],
            );
            if (existing) {
              if (
                parseActiveGameSave(JSON.parse(existing.payload)).roundId ===
                round.roundId
              )
                continue;
              await tx.execute(
                'INSERT OR IGNORE INTO local_rounds(id,payload) VALUES (?,?)',
                [`handoff:${source.datasetId}:${row.id}`, existing.payload],
              );
            }
            await tx.execute(
              'INSERT OR REPLACE INTO local_rounds(id,payload) VALUES (?,?)',
              [
                row.id,
                JSON.stringify({
                  ...round,
                  playerRestoreId: finalState.save.restoreId,
                }),
              ],
            );
          }
          const guestAttempts = Object.fromEntries(
            Object.entries(source.dailyAttempts ?? {}).map(([key, value]) => [
              key,
              {
                ...parseActiveGameSave(value),
                playerRestoreId: finalState.save.restoreId,
              },
            ]),
          );
          finalState.dailyAttempts = {
            ...guestAttempts,
            ...finalState.dailyAttempts,
          };
          const [hasState] = await tx.getAll<LocalRow>(
            "SELECT id,payload FROM local_state WHERE id = 'player'",
          );
          if (!hasState)
            finalState.save.data = structuredClone(source.save.data);
        }
        await tx.execute(
          "INSERT OR REPLACE INTO local_state(id,payload) VALUES ('player',?)",
          [JSON.stringify(finalState)],
        );
        await tx.execute("DELETE FROM local_state WHERE id = 'cutover-rebind'");
      });
      clearSentryUser();
      localStorage.setItem(selectionKey, destination.id);
      if (hasGuest && !useAccountOnly)
        await guest.writeTransaction(async (tx) => {
          for (const table of localTables)
            await tx.execute(`DELETE FROM ${table}`);
          await tx.execute(
            "INSERT INTO local_state(id,payload) VALUES ('player',?)",
            [
              JSON.stringify({
                version: 2,
                datasetId: crypto.randomUUID(),
                save: {
                  version: SAVE_SCHEMA_VERSION,
                  restoreId: crypto.randomUUID(),
                  data: {
                    ...emptyPlayerData(),
                    profile: createTrainerProfile(),
                  },
                },
              }),
            ],
          );
        });
      const welcomePending = writeStoredValue(
        'sessionStorage',
        accountWelcomeKey,
        destination.id,
      );
      if (!welcomePending)
        window.history.replaceState(
          null,
          '',
          accountReturnPath(window.location.href),
        );
      window.location.reload();
    } finally {
      await guest.close();
      await target.close();
    }
  });
}

function connector(expected: Binding): PowerSyncBackendConnector {
  return {
    fetchCredentials: async () => {
      const bootstrap = await accountRequest('/api/account');
      const current = parseBinding(bootstrap);
      if (current.id !== expected.id)
        throw new Error(
          'Sign in to the original account. Pending progress remains separate.',
        );
      if (current.serverEpoch !== expected.serverEpoch)
        throw new Error(reconnectMessage);
      const sync = readSyncConnection(
        isRecord(bootstrap) ? bootstrap.sync : undefined,
      );
      const { data, error } = await auth.token();
      if (error || !data) throw new Error('Sign in to resume syncing.');
      const claims: unknown = JSON.parse(
        atob(data.token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')),
      );
      if (!isRecord(claims) || claims.sub !== expected.id)
        throw new Error('Account changed. Sync is paused.');
      if (claims.aud !== sync.audience)
        throw new Error('Sync configuration changed. Reconnect to try again.');
      return { endpoint: sync.endpoint, token: data.token };
    },
    uploadData: async (db) => {
      const transaction = await db.getNextCrudTransaction();
      if (!transaction) return;
      const actions = await Promise.all(
        transaction.crud
          .filter((entry) => {
            if (entry.table !== 'pending_actions')
              throw new Error('An unexpected change is waiting to sync.');
            return entry.op !== UpdateType.DELETE;
          })
          .map(async (entry) => {
            if (
              entry.op !== UpdateType.PUT ||
              typeof entry.opData?.payload !== 'string'
            )
              throw new Error('An unexpected change is waiting to sync.');
            const action: unknown = JSON.parse(entry.opData.payload);
            if (
              !isRecord(action) ||
              action.id !== entry.id ||
              typeof action.datasetId !== 'string' ||
              !['round', 'edit'].includes(String(action.kind)) ||
              !isRecord(action.payload) ||
              action.payload.id !== action.id
            )
              throw new Error('A saved change could not be verified.');
            const converted = action as LocalAction;
            return converted.kind === 'edit' && converted.legacyAction
              ? {
                  ...converted,
                  payload: {
                    ...(converted.payload as object),
                    legacy_hash: await hash(converted.legacyAction),
                  },
                }
              : converted;
          }),
      );
      for (let offset = 0; offset < actions.length; offset += 50) {
        const batch = actions.slice(offset, offset + 50);
        const result = await accountRequest('/api/sync/changes', {
          expectedAccountId: expected.id,
          serverEpoch: expected.serverEpoch,
          actions: batch,
        });
        if (
          !isRecord(result) ||
          !Array.isArray(result.outcomes) ||
          result.outcomes.length !== batch.length
        )
          throw new Error(
            'The sync response was incomplete. Your progress is still saved here.',
          );
        const seen = new Set<string>();
        for (const value of result.outcomes as unknown[]) {
          if (
            !isRecord(value) ||
            typeof value.id !== 'string' ||
            seen.has(value.id)
          )
            throw new Error('Invalid sync receipt.');
          const action = batch.find((a) => a.id === value.id);
          if (
            !action ||
            !['accepted', 'rejected'].includes(String(value.status)) ||
            (action.kind === 'round' &&
              value.status === 'accepted' &&
              typeof value.credited !== 'boolean')
          )
            throw new Error('Invalid sync receipt.');
          seen.add(value.id);
          if (action.kind === 'round' && value.status === 'accepted') {
            await db.execute(
              "UPDATE local_completions SET payload = json_set(payload,'$.credited',?) WHERE id = ?",
              [value.credited ? 1 : 0, action.id],
            );
          }
          if (value.status !== 'accepted')
            await db.execute(
              'INSERT OR REPLACE INTO local_state(id,payload) VALUES (?,?)',
              [`failure:${action.id}`, JSON.stringify(value)],
            );
        }
      }
      await transaction.complete();
      for (const action of actions)
        await db.execute('DELETE FROM pending_actions WHERE id = ?', [
          action.id,
        ]);
      void refresh();
    },
  };
}

let refreshing = Promise.resolve();
async function refreshAccount() {
  if (!account) return;
  const issues = await transactPlayer(async (state, tx) => {
    await projectAccount(state, tx);
    return readAccountIssues(state, tx);
  });
  const [count] = await account.getAll<{ count: number }>(
    'SELECT COUNT(*) AS count FROM pending_actions',
  );
  const unresolved = issues.filter((issue) => !issue.resolving);
  const status = account.currentStatus;
  const uploadError = navigator.onLine ? status.uploadError : undefined;
  const downloadError = navigator.onLine ? status.downloadError : undefined;
  const syncError = uploadError?.message ?? downloadError?.message ?? '';
  update({
    pending: count?.count ?? 0,
    issues,
    status: unresolved.length
      ? 'Some changes need your review.'
      : !navigator.onLine
        ? 'Saved on this device. Will sync when connected.'
        : syncError
          ? 'Sync paused'
          : (count?.count ?? 0) > 0
            ? 'Saved on this device. Syncing…'
            : status.connected && status.hasSynced
              ? 'Synced'
              : 'Saved on this device. Connecting…',
    error: syncError,
    diagnostic: uploadError
      ? syncDiagnostic('Upload', uploadError)
      : downloadError
        ? syncDiagnostic('Download', downloadError)
        : '',
  });
}
const refresh = () => {
  refreshing = refreshing.then(refreshAccount).catch((error: Error) =>
    update({
      error: error.message,
      diagnostic: syncDiagnostic('Local refresh', error),
      status: 'Saved on this device. Sync is paused.',
    }),
  );
  return refreshing;
};
export async function resolveAccountIssue(
  issue: AccountIssue,
  reapply: boolean,
) {
  await transactPlayer((state, tx) =>
    queueIssueResolution(state, tx, issue, reapply),
  );
  await refresh();
}
export function loadAccountConfig() {
  return accountRequest('/api/account/config')
    .then((value) => {
      if (isRecord(value) && typeof value.emailDelivery === 'string')
        update({ emailDelivery: value.emailDelivery });
    })
    .catch(() => {});
}
export async function startAccountSync() {
  void refreshSentryIdentity().catch(clearSentryUser);
  void revokePendingSession().catch(() =>
    update({
      error:
        'Signed out on this device. Server sign-out is pending until you reconnect.',
    }),
  );
  window.addEventListener('online', () => {
    void revokePendingSession().catch(() => {});
    void refreshSentryIdentity().catch(clearSentryUser);
  });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible')
      void refreshSentryIdentity().catch(clearSentryUser);
  });
  window.addEventListener('storage', (event) => {
    if (event.key === selectionKey) {
      clearSentryUser();
      window.location.assign('/');
    }
  });
  const state = await readState(getPlayerDatabase());
  if (!state.account) return;
  binding = state.account;
  account = getPlayerDatabase();
  update({ owner: binding.id });
  const changed = () => {
    void refresh();
  };
  account.onChange(
    { onChange: changed },
    {
      tables: [
        'player',
        'pending_actions',
        'round',
        'local_completions',
        'local_state',
      ],
    },
  );
  account.registerListener({ statusChanged: changed });
  window.addEventListener('online', changed);
  window.addEventListener('offline', changed);
  void refresh();
  void account.connect(connector(binding)).catch((error: Error) =>
    update({
      error: error.message,
      diagnostic: syncDiagnostic('Connect', error),
      status: 'Sync paused',
    }),
  );
}

export async function retryAccountSync() {
  if (!account || !binding) return;
  update({ error: '', diagnostic: '', status: 'Reconnecting…' });
  try {
    await account.connect(connector(binding));
    await refresh();
  } catch (error) {
    update({
      error: error instanceof Error ? error.message : 'Sync could not connect.',
      diagnostic:
        error instanceof Error
          ? syncDiagnostic('Reconnect', error)
          : `Reconnect: ${String(error)}`,
      status: 'Sync paused',
    });
  }
}
export async function reconnectAccount() {
  const current = parseBinding(await accountRequest('/api/account'));
  const database = getPlayerDatabase();
  await navigator.locks.request('quizmon-account-handoff', async () => {
    const saved = await readState(database);
    if (selectedAccount() !== current.id || saved.account?.id !== current.id)
      throw new Error('Sign in to the original account before reconnecting.');
    if (saved.account.serverEpoch === current.serverEpoch) return;
    await account?.disconnect();
    const linked = await accountRequest('/api/account/link', {
      expectedAccountId: current.id,
      ...current,
      datasetId: saved.datasetId,
      linkId: saved.datasetId,
      merge: true,
    });
    if (!isRecord(linked) || linked.linked !== true)
      throw new Error('This device save could not be linked to the account.');
    await database.writeTransaction(async (tx) => {
      const state = await readState(tx);
      if (state.account?.id !== current.id)
        throw new Error('The selected account changed during reconnection.');
      state.account = current;
      await tx.execute("UPDATE local_state SET payload=? WHERE id='player'", [
        JSON.stringify(state),
      ]);
      await tx.execute("DELETE FROM local_state WHERE id = 'cutover-rebind'");
    });
  });
  window.location.reload();
}
export async function signOutAccount() {
  clearSentryUser();
  await account?.disconnect();
  try {
    const { error } = await auth.signOut();
    if (error) throw new Error(error.message);
  } catch {
    localStorage.setItem('quizmon.baseline.revocation-pending', 'true');
  }
  localStorage.removeItem(selectionKey);
  window.location.assign('/');
}

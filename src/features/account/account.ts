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
import {
  hash,
  validAction,
  validActionEnvelope,
  validEdit,
  type Action,
} from '../../domain/sync/progress';
import { projectAccount } from '../../lib/storage/account-projection';
import {
  queueIssueResolution,
  readAccountIssues,
  type AccountIssue,
} from '../../lib/storage/account-issues';
import {
  getPowerSyncDatabase,
  localTables,
  openLocalDatabase,
  type LocalRow,
} from '../../lib/storage/local-database';
import {
  getPlayerDatabase,
  parseLocalPlayerState,
  readState,
  transactPlayer,
} from '../../lib/storage/player-storage';
import { isRecord } from '../../lib/validation';
import { readSyncConnection } from '../../domain/sync/connection';

const selectionKey = 'quizmon.account.v1';
const auth = createAuthClient({ plugins: [emailOTPClient(), jwtClient()] });
type Binding = { id: string; generationId: string; serverEpoch: string };
let account: PowerSyncDatabase | undefined;
let binding: Binding | undefined;
let candidate: Binding | undefined;
let snapshot = {
  owner: '',
  status: 'Saved on this device',
  error: '',
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
export const accountSnapshot = () => snapshot;
export const subscribeAccount = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const selectedAccount = () =>
  localStorage.getItem(selectionKey) ?? undefined;
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
    typeof value.generationId !== 'string' ||
    typeof value.serverEpoch !== 'string'
  )
    throw new Error('The account service returned an invalid save identity.');
  return {
    id: value.id,
    generationId: value.generationId,
    serverEpoch: value.serverEpoch,
  };
};
async function revokePendingSession() {
  if (!localStorage.getItem('quizmon.revocation-pending')) return;
  const { error } = await auth.signOut();
  if (error)
    throw new Error(
      'Reconnect to finish signing out before starting another session.',
    );
  localStorage.removeItem('quizmon.revocation-pending');
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
  const result = await auth.signIn.emailOtp({ email, otp });
  if (result.error)
    throw new Error(result.error.message ?? 'Check your code and try again.');
  await continueSignIn();
}
export async function continueSignIn() {
  candidate = parseBinding(await accountRequest('/api/account'));
  if (selectedAccount() === candidate.id) {
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
function orderGuestActions(rows: LocalRow[]) {
  const remaining = rows.map((row) => ({
    row,
    action: JSON.parse(row.payload) as Action,
  }));
  const ordered: LocalRow[] = [];
  const ids = new Set(rows.map((row) => row.id));
  const seen = new Set<string>();
  while (remaining.length) {
    const index = remaining.findIndex(
      ({ action }) =>
        !validEdit(action.payload) ||
        !action.payload.predecessorId ||
        !ids.has(action.payload.predecessorId) ||
        seen.has(action.payload.predecessorId),
    );
    if (index < 0)
      throw new Error('The browser save contains an invalid edit history.');
    const { row } = remaining.splice(index, 1)[0]!;
    ordered.push(row);
    seen.add(row.id);
  }
  return ordered;
}
export async function finishSignIn(merge: boolean, useAccountOnly = false) {
  if (!candidate)
    candidate = parseBinding(await accountRequest('/api/account'));
  const destination = candidate;
  await navigator.locks.request('quizmon-account-handoff', async () => {
    const guest = openLocalDatabase();
    const target = openLocalDatabase(destination.id);
    const targetSync = getPowerSyncDatabase(target);
    try {
      await guest.init();
      await target.init();
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
      if (
        targetState?.account &&
        JSON.stringify(targetState.account) !== JSON.stringify(destination)
      )
        throw new Error(
          'This account history has changed. Your existing local save has been preserved.',
        );
      targetState ??= {
        version: 1,
        datasetId: crypto.randomUUID(),
        predecessors: {},
        account: destination,
        editRevisions: {},
        save: {
          version: SAVE_SCHEMA_VERSION,
          restoreId: crypto.randomUUID(),
          data: { ...emptyPlayerData(), profile: createTrainerProfile() },
        },
      };
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
          for (const row of orderGuestActions(
            await guest.getAll<LocalRow>(
              'SELECT id,payload FROM local_actions',
            ),
          )) {
            const original: unknown = JSON.parse(row.payload);
            if (!validAction(original))
              throw new Error(
                'A browser change could not be read. Download a backup before retrying.',
              );
            const action: Action = {
              ...original,
              generationId: destination.generationId,
            };
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
          for (const table of ['local_completions'] as const)
            for (const row of await guest.getAll<LocalRow>(
              `SELECT id,payload FROM ${table}`,
            ))
              await tx.execute(
                `INSERT OR IGNORE INTO ${table}(id,payload) VALUES (?,?)`,
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
      });
      localStorage.setItem(selectionKey, destination.id);
      if (hasGuest && !useAccountOnly)
        await guest.writeTransaction(async (tx) => {
          for (const table of localTables)
            await tx.execute(`DELETE FROM ${table}`);
          await tx.execute(
            "INSERT INTO local_state(id,payload) VALUES ('player',?)",
            [
              JSON.stringify({
                version: 1,
                datasetId: crypto.randomUUID(),
                predecessors: {},
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
      window.history.replaceState(
        null,
        '',
        accountReturnPath(window.location.href),
      );
      window.location.reload();
    } finally {
      await getPowerSyncDatabase(guest).close();
      await targetSync.close();
    }
  });
}

function connector(expected: Binding): PowerSyncBackendConnector {
  return {
    fetchCredentials: async () => {
      const bootstrap = await accountRequest('/api/account');
      const current = parseBinding(bootstrap);
      if (JSON.stringify(current) !== JSON.stringify(expected))
        throw new Error(
          'Sign in to the original account. Pending progress remains separate.',
        );
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
      const actions = transaction.crud.map((entry) => {
        if (
          entry.table !== 'pending_actions' ||
          entry.op !== UpdateType.PUT ||
          typeof entry.opData?.payload !== 'string'
        )
          throw new Error('An unexpected change is waiting to sync.');
        const action: unknown = JSON.parse(entry.opData.payload);
        if (!validActionEnvelope(action) || action.operationId !== entry.id)
          throw new Error('A saved change could not be verified.');
        return action;
      });
      for (let offset = 0; offset < actions.length; offset += 50) {
        const batch = actions.slice(offset, offset + 50);
        const result = await accountRequest('/api/sync/operations', {
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
            typeof value.operationId !== 'string' ||
            seen.has(value.operationId)
          )
            throw new Error('Invalid sync receipt.');
          const action = batch.find((a) => a.operationId === value.operationId);
          if (
            !action ||
            value.requestHash !== (await hash(action)) ||
            !['accepted', 'rejected', 'conflict'].includes(
              String(value.status),
            ) ||
            !Number.isSafeInteger(value.revision)
          )
            throw new Error('Invalid sync receipt.');
          seen.add(value.operationId);
          if (value.status !== 'accepted')
            await db.execute(
              'INSERT OR REPLACE INTO local_state(id,payload) VALUES (?,?)',
              [`failure:${action.operationId}`, JSON.stringify(value)],
            );
        }
      }
      await transaction.complete();
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
  update({
    pending: count?.count ?? 0,
    issues,
    status: unresolved.length
      ? 'Some changes need your review.'
      : !navigator.onLine
        ? 'Saved on this device. Will sync when connected.'
        : (count?.count ?? 0) > 0
          ? 'Saved on this device. Syncing…'
          : status.connected && status.hasSynced
            ? 'Synced'
            : 'Saved on this device. Connecting…',
    error: !navigator.onLine
      ? ''
      : (status.dataFlowStatus.uploadError?.message ??
        status.dataFlowStatus.downloadError?.message ??
        ''),
  });
}
const refresh = () => {
  refreshing = refreshing.then(refreshAccount).catch((error: Error) =>
    update({
      error: error.message,
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
    .catch(() =>
      update({
        error: 'Sign-in is unavailable. You can keep playing on this device.',
      }),
    );
}
export async function startAccountSync() {
  void revokePendingSession().catch(() =>
    update({
      error:
        'Signed out on this device. Server sign-out is pending until you reconnect.',
    }),
  );
  window.addEventListener('online', () => {
    void revokePendingSession().catch(() => {});
  });
  window.addEventListener('storage', (event) => {
    if (event.key === selectionKey) window.location.assign('/');
  });
  const state = await readState(getPlayerDatabase());
  if (!state.account) return;
  binding = state.account;
  account = getPowerSyncDatabase(getPlayerDatabase());
  update({ owner: binding.id });
  const changed = () => {
    void refresh();
  };
  account.onChange(
    { onChange: changed },
    {
      tables: [
        'account_state',
        'player_pokemon',
        'pending_actions',
        'sync_issues',
        'completion_facts',
      ],
    },
  );
  account.registerListener({ statusChanged: changed });
  window.addEventListener('online', changed);
  window.addEventListener('offline', changed);
  void refresh();
  void account
    .connect(connector(binding))
    .catch((error: Error) => update({ error: error.message }));
}
export async function signOutAccount() {
  await account?.disconnect();
  try {
    const { error } = await auth.signOut();
    if (error) throw new Error(error.message);
  } catch {
    localStorage.setItem('quizmon.revocation-pending', 'true');
  }
  localStorage.removeItem(selectionKey);
  window.location.assign('/');
}

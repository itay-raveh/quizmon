import { decodeJwt } from 'jose';
import { emailOTPClient, jwtClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import {
  replicateServer,
  type RxServerReplicationState,
} from 'rxdb-server/plugins/replication-server';
import { readSyncConnection } from '../../domain/sync/connection';
import { clearSentryUser, setVerifiedSentryUser } from '../../lib/sentry';
import {
  currentOwnerId,
  getPlayerDatabase,
  playerDatabaseName,
} from '../../lib/storage/player-storage';
import { openPlayerDatabase } from '../../lib/storage/rxdb-database';
import {
  emptyDeviceState,
  ensureDeviceState,
  parseDeviceState,
  readDeviceState,
  updateDeviceState,
  writeCompletedRound,
} from '../../lib/storage/rxdb-game';
import { playerSchema, roundSchema } from '../../lib/storage/rxdb-schema';
import { isRecord } from '../../lib/validation';
import { accountReturnPath } from './account-navigation';

const auth = createAuthClient({ plugins: [emailOTPClient(), jwtClient()] });
const selectionKey = 'quizmon.baseline.account';
export const accountWelcomeKey = 'quizmon.baseline.account-welcome';
type RecoveryReason = 'sign-in' | 'retry' | null;
let candidate: string | undefined;
let started = false;
let tokenTimer: ReturnType<typeof setInterval> | undefined;
let replications: RxServerReplicationState<unknown>[] = [];
let snapshot = {
  owner: '',
  status: 'Saved on this device',
  error: '',
  recoveryReason: null as RecoveryReason,
  offline: false,
  diagnostic: '',
  mergeRequired: false,
  emailDelivery: '',
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
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) clearSentryUser();
    throw new Error(
      isRecord(value) && typeof value.error === 'string'
        ? value.error
        : response.status === 401
          ? 'Sign in to resume syncing.'
          : `Account service unavailable (${response.status}).`,
    );
  }
  return value;
}

const accountIdFrom = (value: unknown): string => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(value.id)
  )
    throw new Error('The account service returned an invalid identity.');
  return value.id;
};

export async function sendSignInCode(email: string) {
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
    throw new Error(
      result.error.code === 'INVALID_OTP' || result.error.code === 'OTP_EXPIRED'
        ? 'Invalid code'
        : (result.error.message ?? 'Check the code and try again.'),
    );
  await continueSignIn();
}

export async function continueSignIn() {
  candidate = accountIdFrom(await accountRequest('/api/account'));
  if (candidate === selectedAccount()) {
    window.location.reload();
    return;
  }
  if (currentOwnerId() !== 'guest')
    throw new Error('Sign out of the current account before switching.');
  const guest = getPlayerDatabase();
  const [rounds, player, local] = await Promise.all([
    guest.rounds.find().exec(),
    guest.players.findOne('guest').exec(),
    guest.device.find().exec(),
  ]);
  const state = local.find((entry) => entry.id === 'state');
  if (
    rounds.length ||
    player ||
    local.some((entry) => entry.id !== 'state') ||
    (state &&
      JSON.stringify(parseDeviceState(state.payload)) !==
        JSON.stringify(emptyDeviceState()))
  ) {
    update({ mergeRequired: true });
    return;
  }
  await finishSignIn(false, true);
}

export async function finishSignIn(merge: boolean, useAccountOnly = false) {
  candidate ??= accountIdFrom(await accountRequest('/api/account'));
  const owner = candidate;
  const handoff = async () => {
    if (merge && !useAccountOnly) {
      const guest = getPlayerDatabase();
      const target = await openPlayerDatabase(await playerDatabaseName(owner));
      try {
        await ensureDeviceState(target);
        const rounds = await guest.rounds.find().exec();
        for (const round of rounds)
          await writeCompletedRound(target, owner, round.fact);
        const [guestPlayer, accountPlayer] = await Promise.all([
          guest.players.findOne('guest').exec(),
          target.players.findOne(owner).exec(),
        ]);
        if (guestPlayer && !accountPlayer)
          await target.players.insert({
            ...guestPlayer.toMutableJSON(),
            id: owner,
            ownerId: owner,
          });
        const local = await guest.device.find().exec();
        const accountState = await readDeviceState(target);
        const source = local.find((entry) => entry.id === 'state');
        const guestState = source
          ? parseDeviceState(source.payload)
          : emptyDeviceState();
        await updateDeviceState(target, (state) => {
          if (
            guestState.questionHistory.sequence > state.questionHistory.sequence
          ) {
            state.questionHistory = guestState.questionHistory;
          }
          state.dailyAttempts = {
            ...guestState.dailyAttempts,
            ...state.dailyAttempts,
          };
        });
        for (const entry of local.filter(
          (document) => document.id !== 'state',
        )) {
          if (!(await target.device.findOne(entry.id).exec()))
            await target.device.insert({
              id: entry.id,
              payload: entry.id.startsWith('round:')
                ? { ...entry.payload, playerRestoreId: accountState.restoreId }
                : entry.payload,
            });
        }
      } finally {
        await target.close();
      }
    }
    localStorage.setItem(selectionKey, owner);
    sessionStorage.setItem(accountWelcomeKey, owner);
    window.history.replaceState(
      null,
      '',
      accountReturnPath(window.location.href),
    );
    window.location.reload();
  };
  if (navigator.locks)
    await navigator.locks.request('quizmon-account-handoff', handoff);
  else await handoff();
}

export function loadAccountConfig() {
  return accountRequest('/api/account/config')
    .then((value) => {
      if (isRecord(value) && typeof value.emailDelivery === 'string')
        update({ emailDelivery: value.emailDelivery });
    })
    .catch(() => {});
}

const stopReplication = async () => {
  if (tokenTimer) clearInterval(tokenTimer);
  tokenTimer = undefined;
  await Promise.allSettled(
    replications.map((replication) => replication.cancel()),
  );
  replications = [];
};

const syncToken = async (expected: string) => {
  const { data, error } = await auth.token();
  if (error || !data) throw new Error('Sign in to resume syncing.');
  if (decodeJwt(data.token).sub !== expected)
    throw new Error('The signed-in account changed. Sync is paused.');
  return data.token;
};

export async function startAccountSync() {
  if (started) return;
  started = true;
  const owner = selectedAccount();
  if (!owner) return;
  update({ owner, offline: !navigator.onLine });
  const refreshIdentity = async () => {
    const version = clearSentryUser();
    const { data } = await auth.getSession();
    if (data?.user.id === owner && data.user.email)
      await setVerifiedSentryUser(owner, data.user.email, version);
  };
  void refreshIdentity().catch(() => {});
  window.addEventListener('online', () => {
    update({ offline: false, status: 'Saved on this device. Syncing…' });
    void retryAccountSync();
  });
  window.addEventListener('offline', () => {
    update({
      offline: true,
      status: 'Saved on this device. Will sync when connected.',
    });
  });
  window.addEventListener('storage', (event) => {
    if (event.key === selectionKey) window.location.assign('/');
  });
  await retryAccountSync();
}

export async function retryAccountSync() {
  const owner = selectedAccount();
  if (!owner) return;
  await stopReplication();
  try {
    const bootstrap = await accountRequest('/api/account');
    if (accountIdFrom(bootstrap) !== owner)
      throw new Error('Sign in to the same account to resume syncing.');
    const sync = readSyncConnection(
      isRecord(bootstrap) ? bootstrap.sync : null,
    );
    const token = await syncToken(owner);
    const headers = { Authorization: `Bearer ${token}` };
    const db = getPlayerDatabase();
    const base = sync.endpoint;
    const players = replicateServer({
      collection: db.players,
      replicationIdentifier: `quizmon-players-${owner}`,
      url: `${base}/players/${playerSchema.version}`,
      headers,
      push: {},
      pull: {},
      live: true,
    });
    const rounds = replicateServer({
      collection: db.rounds,
      replicationIdentifier: `quizmon-rounds-${owner}`,
      url: `${base}/rounds/${roundSchema.version}`,
      headers,
      push: {},
      pull: {},
      live: true,
    });
    replications = [players, rounds];
    for (const replication of replications) {
      replication.error$.subscribe((error) =>
        update({
          error: error.message,
          recoveryReason: 'retry',
          diagnostic: error.stack ?? error.message,
          status: 'Saved on this device. Sync is retrying.',
        }),
      );
      replication.unauthorized$.subscribe(() => {
        void syncToken(owner)
          .then((fresh) => {
            replication.setHeaders({ Authorization: `Bearer ${fresh}` });
            replication.reSync();
          })
          .catch((error: Error) =>
            update({
              error: error.message,
              recoveryReason: 'sign-in',
            }),
          );
      });
      replication.outdatedClient$.subscribe(() =>
        update({
          error: 'Update Quizmon to resume syncing.',
          recoveryReason: 'retry',
        }),
      );
    }
    tokenTimer = setInterval(() => {
      void syncToken(owner)
        .then((fresh) => {
          replications.forEach((replication) => {
            replication.setHeaders({ Authorization: `Bearer ${fresh}` });
            replication.reSync();
          });
        })
        .catch((error: Error) =>
          update({
            error: error.message,
            recoveryReason: 'sign-in',
          }),
        );
    }, 240_000);
    update({
      error: '',
      diagnostic: '',
      recoveryReason: null,
      status: navigator.onLine
        ? 'Saved on this device. Syncing…'
        : 'Saved on this device. Will sync when connected.',
    });
    void Promise.all(
      replications.map((replication) => replication.awaitInitialReplication()),
    )
      .then(() => update({ status: 'Synced', error: '', diagnostic: '' }))
      .catch((error: Error) =>
        update({
          error: error.message,
          recoveryReason: 'retry',
          status: 'Saved on this device. Sync is retrying.',
        }),
      );
  } catch (error) {
    update({
      error: error instanceof Error ? error.message : 'Sync is unavailable.',
      recoveryReason: 'retry',
      status: 'Saved on this device. Sync is paused.',
    });
  }
}

export async function signOutAccount() {
  clearSentryUser();
  await stopReplication();
  await auth.signOut();
  localStorage.removeItem(selectionKey);
  window.location.assign('/');
}

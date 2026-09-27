const mocks = vi.hoisted(() => ({
  replications: [] as unknown[],
  invalidConfig: false,
}));

vi.mock('better-auth/react', () => ({
  createAuthClient: () => ({
    getSession: () => Promise.resolve({ data: null }),
  }),
}));
vi.mock('better-auth/client/plugins', () => ({ emailOTPClient: () => ({}) }));
vi.mock('jose', () => ({ decodeJwt: () => ({ sub: 'owner' }) }));
vi.mock('rxdb-server/plugins/replication-server', () => ({
  replicateServer: () => mocks.replications.shift(),
}));
vi.mock('../../domain/sync/connection', () => ({
  readSyncConnection: () => {
    if (mocks.invalidConfig) throw new TypeError('Invalid URL');
    return { endpoint: 'https://sync.test' };
  },
}));
vi.mock('../../lib/sentry', () => ({
  clearSentryUser: () => 0,
  setVerifiedSentryUser: () => Promise.resolve(),
}));
vi.mock('../../lib/storage/player-storage', () => ({
  getPlayerDatabase: () => ({ players: {}, rounds: {} }),
}));
vi.mock('../../lib/storage/rxdb-database', () => ({}));
vi.mock('../../lib/storage/rxdb-game', () => ({}));

const stream = <T>(initial?: T) => {
  const listeners = new Set<(value: T) => void>();
  return {
    observable: {
      subscribe(listener: (value: T) => void) {
        listeners.add(listener);
        if (initial !== undefined) listener(initial);
        return { unsubscribe: () => listeners.delete(listener) };
      },
    },
    emit(value: T) {
      listeners.forEach((listener) => listener(value));
    },
  };
};

const replication = () => {
  const error = stream<Error>();
  const active = stream(false);
  const unauthorized = stream<void>();
  const outdatedClient = stream<void>();
  let stopped = false;
  return {
    error,
    active,
    state: {
      error$: error.observable,
      active$: active.observable,
      unauthorized$: unauthorized.observable,
      outdatedClient$: outdatedClient.observable,
      cancel: () => {
        stopped = true;
        return Promise.resolve();
      },
      isStopped: () => stopped,
      awaitInitialReplication: () => Promise.resolve(),
      reSync: vi.fn(),
      setHeaders: vi.fn(),
    },
  };
};

it('retries account startup and wake failures, then clears a recovered replication error', async () => {
  vi.useFakeTimers();
  const storage = new Map([['quizmon.baseline.account', 'owner']]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
  });
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('window', new EventTarget());
  const page = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('document', page);

  let accountCalls = 0;
  let failNextToken = false;
  const fetchMock = vi.fn((input: string) => {
    if (input === '/api/account') {
      accountCalls++;
      if (accountCalls === 1 || accountCalls === 3)
        return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(Response.json({ id: 'owner', sync: {} }));
    }
    if (input === '/api/auth/token') {
      if (failNextToken) {
        failNextToken = false;
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return Promise.resolve(Response.json({ token: 'test-token' }));
    }
    throw new Error(`Unexpected request: ${input}`);
  });
  vi.stubGlobal('fetch', fetchMock);

  const first = replication();
  const second = replication();
  mocks.replications.push(first.state, second.state);
  const { accountSnapshot, retryAccountSync, startAccountSync } =
    await import('./account');

  await startAccountSync();
  expect(accountSnapshot()).toMatchObject({ offline: true, error: '' });
  await vi.advanceTimersByTimeAsync(5_000);
  expect(accountCalls).toBe(2);
  expect(accountSnapshot()).toMatchObject({ offline: false, status: 'Synced' });

  first.error.emit(new Error('temporary network failure'));
  expect(accountSnapshot().error).toContain('temporary network failure');
  first.active.emit(true);
  first.active.emit(false);
  expect(accountSnapshot()).toMatchObject({ error: '', status: 'Synced' });

  failNextToken = true;
  await vi.advanceTimersByTimeAsync(240_000);
  expect(accountSnapshot()).toMatchObject({
    offline: true,
    error: '',
    recoveryReason: 'retry',
  });
  await vi.advanceTimersByTimeAsync(5_000);
  expect(accountSnapshot()).toMatchObject({ offline: false, error: '' });

  page.visibilityState = 'hidden';
  await retryAccountSync();
  expect(accountCalls).toBe(3);
  await vi.advanceTimersByTimeAsync(5_000);
  expect(accountCalls).toBe(3);

  const third = replication();
  const fourth = replication();
  mocks.replications.push(third.state, fourth.state);
  page.visibilityState = 'visible';
  page.dispatchEvent(new Event('visibilitychange'));
  await vi.waitFor(() => expect(accountCalls).toBe(4));
  expect(accountSnapshot()).toMatchObject({ offline: false, status: 'Synced' });

  mocks.invalidConfig = true;
  await retryAccountSync();
  expect(accountSnapshot()).toMatchObject({
    offline: false,
    error: 'Invalid URL',
  });
  await vi.advanceTimersByTimeAsync(5_000);
  expect(accountCalls).toBe(5);

  vi.useRealTimers();
  vi.unstubAllGlobals();
});

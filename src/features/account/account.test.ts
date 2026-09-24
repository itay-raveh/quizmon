import { afterEach, expect, it, vi } from 'vitest';
import { UpdateType } from '@powersync/web';
import * as storage from '../../lib/storage/player-storage';
import {
  accountSnapshot,
  connector,
  loadAccountConfig,
  reconnectAccount,
} from './account';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('leaves malformed sync actions and receipts pending', async () => {
  const id = crypto.randomUUID();
  const action = {
    id,
    datasetId: crypto.randomUUID(),
    kind: 'edit',
    payload: { id },
  };
  let payload = JSON.stringify({ ...action, kind: ['edit'] });
  const complete = vi.fn();
  const db = {
    getNextCrudTransaction: () =>
      Promise.resolve({
        crud: [
          {
            table: 'pending_actions',
            op: UpdateType.PUT,
            id,
            opData: { payload },
          },
        ],
        complete,
      }),
    execute: vi.fn(),
  };
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const upload = connector({
    id: crypto.randomUUID(),
    serverEpoch: crypto.randomUUID(),
  }).uploadData;

  await expect(upload(db as never)).rejects.toThrow(
    'saved change could not be verified',
  );
  expect(fetch).not.toHaveBeenCalled();

  payload = JSON.stringify(action);
  fetch.mockResolvedValue(
    Response.json({ outcomes: [{ id, status: ['accepted'] }] }),
  );
  await expect(upload(db as never)).rejects.toThrow('Invalid sync receipt');
  expect(complete).not.toHaveBeenCalled();
  expect(db.execute).not.toHaveBeenCalled();
});

it('splits uploads by UTF-8 body size and reviews an action too large to send', async () => {
  const datasetId = crypto.randomUUID();
  const actions = [300_000, 300_000, 400_000].map((length) => {
    const id = crypto.randomUUID();
    return {
      id,
      datasetId,
      kind: 'edit',
      payload: { id, unit: 'name', value: '界'.repeat(length) },
    };
  });
  const complete = vi.fn();
  const db = {
    getNextCrudTransaction: () =>
      Promise.resolve({
        crud: actions.map((action) => ({
          table: 'pending_actions',
          op: UpdateType.PUT,
          id: action.id,
          opData: { payload: JSON.stringify(action) },
        })),
        complete,
      }),
    execute: vi.fn(),
  };
  const fetch = vi.fn((_path: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as { actions: typeof actions };
    return Promise.resolve(
      Response.json({
        outcomes: body.actions.map(({ id }) => ({ id, status: 'accepted' })),
      }),
    );
  });
  vi.stubGlobal('fetch', fetch);
  const upload = connector({
    id: crypto.randomUUID(),
    serverEpoch: crypto.randomUUID(),
  }).uploadData;

  await upload(db as never);

  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [, init] of fetch.mock.calls)
    expect(new Blob([init.body as string]).size).toBeLessThanOrEqual(
      1024 * 1024,
    );
  expect(complete).toHaveBeenCalledOnce();
  expect(db.execute).toHaveBeenCalledWith(
    'INSERT OR REPLACE INTO local_state(id,payload) VALUES (?,?)',
    [
      `failure:${actions[2]!.id}`,
      JSON.stringify({
        id: actions[2]!.id,
        status: 'rejected',
        reason: 'too_large',
      }),
    ],
  );
});

it('does not turn a sign-in configuration failure into a sync failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

  await loadAccountConfig();

  expect(accountSnapshot().error).toBe('');
});

it('reconnects only the same account and preserves its local state', async () => {
  const owner = 'account-one';
  const current = { id: owner, serverEpoch: crypto.randomUUID() };
  const state = {
    account: { id: owner, serverEpoch: crypto.randomUUID() },
    datasetId: crypto.randomUUID(),
    save: { keep: 'local progress' },
  };
  const execute = vi.fn();
  const database = {
    writeTransaction: vi.fn(
      async (work: (tx: { execute: typeof execute }) => Promise<void>) =>
        work({ execute }),
    ),
  };
  vi.spyOn(storage, 'getPlayerDatabase').mockReturnValue(
    database as unknown as ReturnType<typeof storage.getPlayerDatabase>,
  );
  vi.spyOn(storage, 'readState').mockResolvedValue(
    state as unknown as Awaited<ReturnType<typeof storage.readState>>,
  );
  vi.stubGlobal('localStorage', { getItem: () => owner });
  vi.stubGlobal('navigator', {
    locks: {
      request: async (_name: string, work: () => Promise<void>) => work(),
    },
  });
  const reload = vi.fn();
  vi.stubGlobal('window', { location: { reload } });
  const fetch = vi.fn((...args: [string, RequestInit?]) =>
    Promise.resolve(
      Response.json(args[0] === '/api/account' ? current : { linked: true }),
    ),
  );
  vi.stubGlobal('fetch', fetch);

  await reconnectAccount();

  expect(fetch.mock.calls.map(([path]) => path)).toEqual([
    '/api/account',
    '/api/account/link',
  ]);
  expect(state.account).toEqual(current);
  expect(state.save).toEqual({ keep: 'local progress' });
  expect(execute).toHaveBeenCalledWith(
    "UPDATE local_state SET payload=? WHERE id='player'",
    [JSON.stringify(state)],
  );
  expect(JSON.parse(fetch.mock.calls[1]![1]!.body as string)).toMatchObject({
    expectedAccountId: owner,
    datasetId: state.datasetId,
    serverEpoch: current.serverEpoch,
  });
  expect(reload).toHaveBeenCalledOnce();

  fetch.mockClear();
  database.writeTransaction.mockClear();
  state.account.serverEpoch = crypto.randomUUID();
  vi.stubGlobal(
    'fetch',
    vi.fn((path: string) =>
      Promise.resolve(
        Response.json(path === '/api/account' ? current : { linked: false }),
      ),
    ),
  );
  await expect(reconnectAccount()).rejects.toThrow(
    'This device save could not be linked',
  );
  expect(database.writeTransaction).not.toHaveBeenCalled();

  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(Response.json({ ...current, id: 'another-account' })),
    ),
  );
  await expect(reconnectAccount()).rejects.toThrow(
    'Sign in to the original account',
  );
  expect(database.writeTransaction).not.toHaveBeenCalled();
});

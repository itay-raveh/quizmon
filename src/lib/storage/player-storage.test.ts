import {
  emptyPlayerData,
  SAVE_SCHEMA_VERSION,
} from '../../domain/player/player-save';
import type { LocalPlayerState } from './player-storage';

const openLocalDatabase = vi.hoisted(() => vi.fn());
vi.mock('./local-database', () => ({ openLocalDatabase }));
vi.mock('./save-compatibility', () => ({ convertSavedDatabaseV1: vi.fn() }));

it('recovers a malformed account state using its matching backup', async () => {
  vi.resetModules();
  const { initializePlayerStorage, recoverPlayer, readPlayerSave } =
    await import('./player-storage');
  const owner = 'trainer';
  let payload = '{broken';
  const db = {
    init: vi.fn(),
    getAll: vi.fn((query: string) =>
      Promise.resolve(
        query.includes("id = 'player'") ? [{ id: 'player', payload }] : [],
      ),
    ),
    execute: vi.fn((_query: string, values: string[]) => {
      payload = values[0]!;
      return Promise.resolve();
    }),
    writeTransaction: vi.fn((run: (tx: unknown) => Promise<void>) => run(db)),
  };
  openLocalDatabase.mockReturnValue(db);
  await expect(initializePlayerStorage(owner)).rejects.toThrow();
  const backup: LocalPlayerState = {
    version: 2 as const,
    datasetId: crypto.randomUUID(),
    account: { id: owner, serverEpoch: crypto.randomUUID() },
    save: {
      version: SAVE_SCHEMA_VERSION,
      restoreId: null,
      data: emptyPlayerData(),
    },
  };
  await recoverPlayer((state) => {
    expect(state.account).toEqual(backup.account);
    return Promise.resolve();
  }, backup);
  expect(readPlayerSave().restoreId).toEqual(expect.any(String));
  expect((JSON.parse(payload) as LocalPlayerState).account).toEqual(
    backup.account,
  );
});

it.each([17, [], { broken: {} }])(
  'leaves malformed Daily attempts unchanged at startup',
  async (dailyAttempts) => {
    vi.resetModules();
    const { initializePlayerStorage } = await import('./player-storage');
    const row = {
      id: 'player',
      payload: JSON.stringify({
        version: 2,
        datasetId: crypto.randomUUID(),
        save: {
          version: SAVE_SCHEMA_VERSION,
          restoreId: null,
          data: emptyPlayerData(),
        },
        dailyAttempts,
      }),
    };
    const originalPayload = row.payload;
    const db = {
      init: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([row]),
      writeTransaction: vi.fn(),
    };
    openLocalDatabase.mockReturnValue(db);

    await expect(initializePlayerStorage()).rejects.toThrow();
    expect(db.writeTransaction).not.toHaveBeenCalled();
    expect(row.payload).toBe(originalPayload);
  },
);

it.each([
  { table: null, accountId: undefined },
  { table: 'local_completions', accountId: undefined },
  { table: 'round', accountId: 'account-1' },
])(
  'initializes only without surviving $table rows',
  async ({ table, accountId }) => {
    vi.resetModules();
    const { initializePlayerStorage, readPlayerSave } =
      await import('./player-storage');
    const rows = new Map<string, { id: string; payload: string }[]>([
      ['local_state', []],
    ]);
    if (table) rows.set(table, [{ id: 'survivor', payload: 'untouched' }]);
    const db = {
      init: vi.fn(),
      getAll: vi.fn((query: string) => {
        const name = /FROM (\w+)/.exec(query)?.[1] ?? '';
        const found = rows.get(name) ?? [];
        return Promise.resolve(
          query.includes("WHERE id = 'player'")
            ? found.filter((row) => row.id === 'player')
            : found,
        );
      }),
      execute: vi.fn((_query: string, values: string[]) => {
        rows.set('local_state', [{ id: 'player', payload: values[0]! }]);
        return Promise.resolve();
      }),
      writeTransaction: vi.fn(async (run: (tx: unknown) => Promise<void>) =>
        run(db),
      ),
      onChange: vi.fn(),
    };
    openLocalDatabase.mockReturnValue(db);

    if (table) {
      await expect(initializePlayerStorage(accountId)).rejects.toThrow(
        'The browser save is incomplete.',
      );
      expect(db.execute).not.toHaveBeenCalled();
      expect(rows.get(table)).toEqual([
        { id: 'survivor', payload: 'untouched' },
      ]);
    } else {
      await initializePlayerStorage(accountId);
      expect(readPlayerSave().data).toEqual(expect.any(Object));
    }
  },
);
it('keeps the save gate active through a retry and prevents parallel retries', async () => {
  vi.resetModules();
  const { getSaveError, isSaveRetrying, reportSaveError, retryPlayerSave } =
    await import('./player-storage');
  let fail!: (error: Error) => void;
  const retry = vi
    .fn()
    .mockImplementationOnce(
      () => new Promise<void>((_resolve, reject) => (fail = reject)),
    )
    .mockResolvedValueOnce(undefined);
  reportSaveError(new Error('Save failed'), retry);

  const pending = retryPlayerSave();
  await retryPlayerSave();
  expect(retry).toHaveBeenCalledOnce();
  expect(isSaveRetrying()).toBe(true);
  expect(getSaveError()).toBe('Save failed');

  fail(new Error('Still failed'));
  await pending;
  expect(isSaveRetrying()).toBe(false);
  expect(getSaveError()).toBe('Still failed');

  await retryPlayerSave();
  expect(getSaveError()).toBe('');
});

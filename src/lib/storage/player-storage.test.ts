import {
  emptyPlayerData,
  SAVE_SCHEMA_VERSION,
} from '../../domain/player/player-save';

const openLocalDatabase = vi.hoisted(() => vi.fn());
vi.mock('./local-database', () => ({ openLocalDatabase }));
vi.mock('./save-compatibility', () => ({ convertSavedDatabaseV1: vi.fn() }));

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

it.each(['local_completions', 'pending_actions'])(
  'blocks account play when %s contains damaged data',
  async (table) => {
    vi.resetModules();
    const { initializePlayerStorage } = await import('./player-storage');
    const state = JSON.stringify({
      version: 2,
      datasetId: crypto.randomUUID(),
      dailyAttempts: {},
      save: {
        version: SAVE_SCHEMA_VERSION,
        restoreId: null,
        data: emptyPlayerData(),
      },
      account: { id: 'account-1', serverEpoch: crypto.randomUUID() },
    });
    const damaged = { id: crypto.randomUUID(), payload: '{damaged' };
    const db = {
      init: vi.fn(),
      getAll: vi.fn((query: string) => {
        const name = /FROM (\w+)/.exec(query)?.[1];
        return Promise.resolve(
          name === 'local_state'
            ? [{ id: 'player', payload: state }]
            : name === table
              ? [damaged]
              : [],
        );
      }),
      execute: vi.fn(),
      writeTransaction: vi.fn(),
      onChange: vi.fn(),
    };
    openLocalDatabase.mockReturnValue(db);

    await expect(initializePlayerStorage('account-1')).rejects.toThrow(
      'Download a recovery copy',
    );
    expect(db.execute).not.toHaveBeenCalled();
    expect(db.writeTransaction).not.toHaveBeenCalled();
    expect(damaged.payload).toBe('{damaged');
  },
);

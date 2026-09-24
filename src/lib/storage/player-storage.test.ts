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

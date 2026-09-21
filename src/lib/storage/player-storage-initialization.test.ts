import { openLocalDatabase } from '../../../tests/fixtures/local-database';
import { progressProjectionVersion } from '../../domain/player/game-history';
import { emptyPlayerData } from '../../domain/player/player-save';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import type { LocalPlayerState } from './player-storage';

let database: ReturnType<typeof openLocalDatabase>;

beforeEach(async () => {
  vi.resetModules();
  database = openLocalDatabase();
  await database.init();
  vi.spyOn(database, 'init').mockResolvedValue();
  vi.doMock('./local-database', () => ({
    openLocalDatabase: () => database,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('./local-database');
});

const store = (state: unknown) =>
  database.execute(
    "INSERT OR REPLACE INTO local_state(id,payload) VALUES ('player',?)",
    [JSON.stringify(state)],
  );

const state = (): LocalPlayerState => ({
  version: 1,
  projectionVersion: progressProjectionVersion,
  datasetId: crypto.randomUUID(),
  predecessors: {},
  dailyAttempts: {},
  save: {
    version: 1,
    restoreId: null,
    data: {
      ...emptyPlayerData(),
      profile: { ...createTrainerProfile(), name: 'Leaf' },
    },
  },
});

it.each(['guest', 'account'] as const)(
  'opens an unchanged %s save without a write transaction',
  async (kind) => {
    const storage = await import('./player-storage');
    const saved = state();
    if (kind === 'account') {
      saved.account = {
        id: 'trainer-account',
        generationId: crypto.randomUUID(),
        serverEpoch: crypto.randomUUID(),
      };
      saved.projectionVersion = 0;
    }
    const current = storage.parseLocalPlayerState(saved);
    await store(current);
    const transaction = vi.spyOn(database, 'writeTransaction');
    const write = vi.spyOn(database, 'execute');

    await storage.initializePlayerStorage(current.account?.id);

    expect(transaction).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(storage.readPlayerSave()).toEqual(current.save);
  },
);

it('initializes an absent save in one transaction', async () => {
  const storage = await import('./player-storage');
  const transaction = vi.spyOn(database, 'writeTransaction');

  await storage.initializePlayerStorage();

  expect(transaction).toHaveBeenCalledOnce();
  const rows = await database.getAll<{ payload: string }>(
    "SELECT payload FROM local_state WHERE id = 'player'",
  );
  expect(rows).toHaveLength(1);
  const saved = storage.parseLocalPlayerState(JSON.parse(rows[0]!.payload));
  expect(saved.projectionVersion).toBe(progressProjectionVersion);
  expect(saved.save).toEqual(storage.readPlayerSave());
  expect(saved.save.data.profile).toMatchObject({
    name: '',
    hasBeenRevealed: false,
  });
});

it('rebuilds the latest transaction snapshot instead of overwriting another tab', async () => {
  const storage = await import('./player-storage');
  const old = { ...state(), projectionVersion: 0 };
  await store(old);
  const newer = structuredClone(old);
  newer.save.data.profile!.name = 'Blue';
  newer.save.restoreId = 'restored-in-another-tab';
  const run = database.writeTransaction.bind(database);
  const transaction = vi
    .spyOn(database, 'writeTransaction')
    .mockImplementation(async (callback) => {
      await store(newer);
      return run(callback);
    });
  await storage.initializePlayerStorage();
  expect(transaction).toHaveBeenCalledOnce();
  expect(storage.readPlayerSave().data.profile?.name).toBe('Blue');
  expect(storage.readPlayerSave().restoreId).toBe('restored-in-another-tab');
});

it('rebuilds outdated guest progress from local history inside the transaction', async () => {
  const storage = await import('./player-storage');
  await store({ ...state(), projectionVersion: 0 });
  await database.execute('INSERT INTO local_actions(id,payload) VALUES (?,?)', [
    crypto.randomUUID(),
    JSON.stringify({
      kind: 'discoveries.add',
      payload: { pokemon: ['pikachu'] },
    }),
  ]);
  const transaction = vi.spyOn(database, 'writeTransaction');

  await storage.initializePlayerStorage();

  expect(transaction).toHaveBeenCalledOnce();
  expect(storage.readPlayerSave().data.pokedex).toEqual(['pikachu']);
  expect(storage.readPlayerSave().data.profile?.name).toBe('Leaf');
  const [row] = await database.getAll<{ payload: string }>(
    "SELECT payload FROM local_state WHERE id = 'player'",
  );
  expect((JSON.parse(row!.payload) as LocalPlayerState).projectionVersion).toBe(
    progressProjectionVersion,
  );
});

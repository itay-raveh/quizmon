import {
  resetLocalSave,
  seedActiveFixture,
} from '../../../tests/fixtures/local-save';
import {
  createPlayerSave,
  readPlayerSave,
  updatePlayerData,
  PLAYER_STORAGE_KEY,
  getPlayerDatabase,
  readState,
  recoverPlayer,
  transactPlayer,
} from './player-storage';
import {
  createRecoveryExport,
  resetSavedData,
  inspectSavedData,
} from './save-recovery';
import { getSaveIssue, reportSaveIssue } from './save-health';
import { ACTIVE_GAME_KEY } from './active-game-storage';
import { createBackup, restoreBackup } from '../../features/settings/backup';

beforeEach(resetLocalSave);
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await recoverPlayer(async () => {});
});
const corruptPlayer = async (raw: string) => {
  const db = getPlayerDatabase();
  await db.execute("UPDATE local_state SET payload = ? WHERE id = 'player'", [
    raw,
  ]);
  try {
    await readState(db);
  } catch (error) {
    reportSaveIssue(error);
  }
};
it.each([2, 3, 8])(
  'preserves rejected version %i byte for byte and blocks writes',
  async (version) => {
    const backup = await createBackup();
    const raw = JSON.stringify(
      { ...backup.state, save: { ...createPlayerSave(), version } },
      null,
      3,
    );
    await corruptPlayer(raw);
    expect(getSaveIssue()?.kind).toBe('newer');
    expect(await updatePlayerData({ generationPromptAnswered: true })).toBe(
      false,
    );
    expect((await createRecoveryExport()).database.local_state).toContainEqual({
      id: 'player',
      payload: raw,
    });
    expect(
      (
        await getPlayerDatabase().getAll<{ payload: string }>(
          "SELECT payload FROM local_state WHERE id = 'player'",
        )
      )[0]?.payload,
    ).toBe(raw);
  },
);
it('exports invalid database JSON and retired browser keys without needing a valid save', async () => {
  await corruptPlayer(' {broken\n');
  localStorage.setItem('quizmon.results.v2', 'old bytes');
  sessionStorage.setItem(ACTIVE_GAME_KEY, 'unfinished bytes');
  localStorage.setItem('unrelated', 'private');
  expect(getSaveIssue()?.kind).toBe('invalid');
  const exported = await createRecoveryExport();
  expect(exported.database.local_state).toContainEqual({
    id: 'player',
    payload: ' {broken\n',
  });
  expect(exported.entries.map(({ raw }) => raw)).toEqual([
    'old bytes',
    'unfinished bytes',
  ]);
  expect(JSON.stringify(exported)).not.toContain('private');
});
it('detects an invalid round and retains its raw database record', async () => {
  await seedActiveFixture({ version: 1 });
  inspectSavedData();
  expect(getSaveIssue()?.kind).toBe('invalid');
  expect((await createRecoveryExport()).database.local_rounds).toContainEqual({
    id: sessionStorage.getItem('quizmon.baseline.tab'),
    payload: '{"version":1}',
  });
});
it('only clears saved gameplay data after a successful reset transaction', async () => {
  await corruptPlayer('{');
  localStorage.setItem(PLAYER_STORAGE_KEY, '{');
  localStorage.setItem('quizmon.results.v2', '{}');
  sessionStorage.setItem(ACTIVE_GAME_KEY, '{');
  localStorage.setItem('quizmon.baseline.daily-reminder-subscription', 'keep');
  const db = getPlayerDatabase();
  const run = db.writeTransaction.bind(db);
  const write = vi
    .spyOn(db, 'writeTransaction')
    .mockImplementation((callback) =>
      run(async (tx) => {
        await callback(tx);
        throw new Error('Storage full');
      }),
    );
  await expect(resetSavedData()).rejects.toThrow('Storage full');
  expect((await createRecoveryExport()).database.local_state).toContainEqual({
    id: 'player',
    payload: '{',
  });
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe('{');
  expect(sessionStorage.getItem(ACTIVE_GAME_KEY)).toBe('{');
  write.mockRestore();
  await resetSavedData();
  expect(readPlayerSave().version).toBe(1);
  expect(readPlayerSave().restoreId).not.toBeNull();
  expect(localStorage.getItem('quizmon.results.v2')).toBeNull();
  expect(sessionStorage.getItem(ACTIVE_GAME_KEY)).toBeNull();
  expect(
    localStorage.getItem('quizmon.baseline.daily-reminder-subscription'),
  ).toBe('keep');
  expect(getSaveIssue()).toBeNull();
});
it('can replace a damaged guest save with a validated current backup', async () => {
  await updatePlayerData({ pokedex: ['pikachu'] });
  const backup = await createBackup();
  await corruptPlayer('{');
  await restoreBackup(backup);
  expect(getSaveIssue()).toBeNull();
  expect(readPlayerSave().data.pokedex).toEqual(['pikachu']);
});
it('reports unavailable browser storage separately from corrupted data', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  inspectSavedData();
  expect(getSaveIssue()?.kind).toBe('unavailable');
});

it('does not expose guest reset or replacement for an account save', async () => {
  await transactPlayer((state) => {
    state.account = {
      id: 'test-account',
      generationId: crypto.randomUUID(),
      serverEpoch: crypto.randomUUID(),
    };
  });
  const before = readPlayerSave();
  try {
    await expect(resetSavedData()).rejects.toThrow(
      'Account progress cannot be reset',
    );
    expect(readPlayerSave()).toEqual(before);
  } finally {
    await transactPlayer((state) => {
      delete state.account;
    });
  }
});

it.each([
  { version: 1, datasetId: 'broken', predecessors: {} },
  { version: 2 },
])('exports a rejected local envelope unchanged: %j', async (envelope) => {
  const raw = JSON.stringify(envelope);
  await corruptPlayer(raw);
  expect(getSaveIssue()?.kind).toBe(
    envelope.version === 2 ? 'newer' : 'invalid',
  );
  expect((await createRecoveryExport()).database.local_state).toContainEqual({
    id: 'player',
    payload: raw,
  });
});

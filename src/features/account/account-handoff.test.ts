import type { ActiveGameSnapshot } from '../../domain/player/active-game';
import {
  SAVE_SCHEMA_VERSION,
  emptyPlayerData,
} from '../../domain/player/player-save';
import { buildQuestions } from '../../domain/quiz/question-generation';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { createSeededRandom } from '../../lib/random';
import { catalog } from '../../../tests/fixtures/catalog';
import { openLocalDatabase as createDatabase } from '../../../tests/fixtures/local-database';
import {
  openLocalDatabase,
  type LocalDatabase,
  type LocalRow,
} from '../../lib/storage/local-database';
import {
  readState,
  type LocalPlayerState,
} from '../../lib/storage/player-storage';
import { finishSignIn } from './account';

vi.mock('../../lib/storage/local-database', async () => ({
  ...(await import('../../../tests/fixtures/local-database')),
  openLocalDatabase: vi.fn(),
  getPowerSyncDatabase: () => ({ close: vi.fn() }),
}));

const destination = {
  id: 'handoff-account',
  generationId: crypto.randomUUID(),
  serverEpoch: crypto.randomUUID(),
};
let guest: LocalDatabase;
let target: LocalDatabase;
let source: LocalPlayerState;
let account: LocalPlayerState;
const snapshot = (): ActiveGameSnapshot => ({
  version: SAVE_SCHEMA_VERSION,
  roundId: crypto.randomUUID(),
  playerRestoreId: source.save.restoreId,
  answers: [],
  contentVersion: 8,
  elapsedMilliseconds: 2500,
  mode: {
    kind: 'daily',
    date: '2026-09-20',
    track: { difficulty: 1, scope: 'all' },
  },
  settings: defaultGameSettings,
  questionCount: 10,
  questions: buildQuestions(
    catalog,
    defaultGameSettings,
    createSeededRandom('handoff-round'),
  ),
  seed: 'handoff-round',
});
const put = (db: LocalDatabase, table: string, id: string, value: unknown) =>
  db.execute(`INSERT OR REPLACE INTO ${table}(id,payload) VALUES (?,?)`, [
    id,
    JSON.stringify(value),
  ]);
const rounds = async (db: LocalDatabase) =>
  Object.fromEntries(
    (await db.getAll<LocalRow>('SELECT id,payload FROM local_rounds')).map(
      (row) => [row.id, JSON.parse(row.payload) as ActiveGameSnapshot],
    ),
  );

beforeEach(async () => {
  localStorage.clear();
  vi.stubGlobal('navigator', {
    locks: {
      request: (_name: string, callback: () => Promise<void>) => callback(),
    },
  });
  vi.stubGlobal('window', {
    location: { href: 'http://localhost/', reload: vi.fn() },
    history: { replaceState: vi.fn() },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(Response.json({ ...destination, linked: true })),
    ),
  );
  guest = createDatabase();
  target = createDatabase();
  await guest.init();
  await target.init();
  await target.execute(
    'CREATE TABLE pending_actions(id TEXT PRIMARY KEY, payload TEXT NOT NULL, sequence INTEGER)',
  );
  guest.init = target.init = async () => {};
  vi.mocked(openLocalDatabase).mockImplementation((id) =>
    id ? target : guest,
  );
  source = {
    version: 1,
    datasetId: crypto.randomUUID(),
    predecessors: {},
    save: {
      version: SAVE_SCHEMA_VERSION,
      restoreId: crypto.randomUUID(),
      data: emptyPlayerData(),
    },
  };
  account = {
    ...structuredClone(source),
    account: destination,
    datasetId: crypto.randomUUID(),
  };
  account.save.restoreId = crypto.randomUUID();
  await put(guest, 'local_state', 'player', source);
  await put(target, 'local_state', 'player', account);
  const operationId = crypto.randomUUID();
  await put(guest, 'local_actions', operationId, {
    operationId,
    datasetId: source.datasetId,
    generationId: source.datasetId,
    payloadVersion: 1,
    kind: 'discoveries.add',
    payload: { pokemon: ['bulbasaur'] },
  });
});
afterEach(() => vi.unstubAllGlobals());

it('imports guest progress without dropping live-tab or closed-tab unfinished rounds', async () => {
  const live = snapshot();
  const abandoned = { ...snapshot(), mode: { kind: 'training' as const } };
  const previousAccountRound = {
    ...snapshot(),
    playerRestoreId: account.save.restoreId,
  };
  await put(guest, 'local_rounds', 'live-tab', live);
  await put(guest, 'local_rounds', 'closed-tab', abandoned);
  await put(target, 'local_rounds', 'live-tab', previousAccountRound);
  source.dailyAttempts = { '2026-09-20:all:1': live };
  await put(guest, 'local_state', 'player', source);

  await finishSignIn(true);

  expect(await rounds(target)).toEqual({
    'live-tab': { ...live, playerRestoreId: account.save.restoreId },
    'closed-tab': { ...abandoned, playerRestoreId: account.save.restoreId },
    [`handoff:${source.datasetId}:live-tab`]: previousAccountRound,
  });
  expect((await readState(target)).dailyAttempts).toEqual({
    '2026-09-20:all:1': { ...live, playerRestoreId: account.save.restoreId },
  });
  expect(await target.getAll('SELECT id FROM pending_actions')).toHaveLength(1);
  expect(await rounds(guest)).toEqual({});
  expect(localStorage.getItem('quizmon.baseline.account')).toBe(destination.id);
});

it('keeps unfinished guest rounds separate when choosing account progress', async () => {
  const round = snapshot();
  await put(guest, 'local_rounds', 'closed-tab', round);
  await finishSignIn(false, true);
  expect(await rounds(guest)).toEqual({ 'closed-tab': round });
  expect(await rounds(target)).toEqual({});
  expect(await readState(guest)).toEqual({ ...source, dailyAttempts: {} });
});

it('retries a transfer interrupted after copying without overwriting either saved round', async () => {
  const round = snapshot();
  const original = { ...snapshot(), playerRestoreId: account.save.restoreId };
  await put(guest, 'local_rounds', 'live-tab', round);
  await put(target, 'local_rounds', 'live-tab', original);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new Error('interrupted');
  });
  await expect(finishSignIn(true)).rejects.toThrow('interrupted');
  expect(await rounds(guest)).toEqual({ 'live-tab': round });
  const advanced = {
    ...round,
    elapsedMilliseconds: 5000,
    answers: [
      {
        category: round.questions[0]!.category,
        questionType: round.questions[0]!.questionType,
        subject: round.questions[0]!.subject,
        cluesUsed: 0,
        correct: true,
        points: 1000,
        responseMilliseconds: 1234,
        speedBonus: 250,
      },
    ],
    playerRestoreId: account.save.restoreId,
  };
  await put(target, 'local_rounds', 'live-tab', advanced);
  await finishSignIn(true);
  expect(await rounds(target)).toEqual({
    'live-tab': advanced,
    [`handoff:${source.datasetId}:live-tab`]: original,
  });
  expect(await target.getAll('SELECT id FROM pending_actions')).toHaveLength(1);
});

it('carries an unanswered round even when there are no guest actions yet', async () => {
  await guest.execute('DELETE FROM local_actions');
  const round = snapshot();
  await put(guest, 'local_rounds', 'live-tab', round);
  await finishSignIn(true);
  expect(await rounds(target)).toEqual({
    'live-tab': { ...round, playerRestoreId: account.save.restoreId },
  });
  expect(await rounds(guest)).toEqual({});
});

it('keeps a completed snapshot until its result is committed, without replaying finalized rounds', async () => {
  const round = snapshot();
  round.completedAt = '2026-09-20T00:00:00.000Z';
  round.answers = round.questions.map((question) => ({
    category: question.category,
    questionType: question.questionType,
    subject: question.subject,
    cluesUsed: 0,
    correct: true,
    points: 1000,
    responseMilliseconds: 1234,
    speedBonus: 250,
  }));
  const finalized = { ...round, roundId: crypto.randomUUID() };
  const receipt = {
    hash: 'already-finalized',
    completion: { completionId: finalized.roundId },
  };
  await put(guest, 'local_rounds', 'unfinished-commit', round);
  await put(guest, 'local_rounds', 'finished-commit', finalized);
  await put(guest, 'local_completions', finalized.roundId, receipt);

  await finishSignIn(true);

  expect(await rounds(target)).toEqual({
    'unfinished-commit': { ...round, playerRestoreId: account.save.restoreId },
  });
  const [saved] = await target.getAll<LocalRow>(
    'SELECT id,payload FROM local_completions WHERE id = ?',
    [finalized.roundId],
  );
  expect(JSON.parse(saved!.payload)).toEqual(receipt);
  expect(await rounds(guest)).toEqual({});
});

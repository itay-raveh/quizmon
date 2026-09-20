import { completion } from '../../../tests/online/progress-fixtures';
import { commitRoundCompletion } from '../../lib/storage/round-storage';
import { catalog } from '../../../tests/fixtures/catalog';
import {
  resetLocalSave,
  saveResult,
  seedStoredFixture,
} from '../../../tests/fixtures/local-save';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { buildQuestions } from '../../domain/quiz/question-generation';
import type { GameResult } from '../../domain/quiz/types';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { createSeededRandom } from '../../lib/random';
import {
  readActiveGame,
  writeActiveGame,
} from '../../lib/storage/active-game-storage';
import { PLAYER_STORAGE_KEY } from '../../lib/storage/storage-keys';
import {
  appendLocalAction,
  getPlayerDatabase,
  readPlayerSave,
  subscribeToPlayerRestore,
  updatePlayerData,
  transactPlayer,
} from '../../lib/storage/player-storage';
import { readDailyResult } from '../../lib/storage/results-storage';
import {
  MAX_BACKUP_BYTES,
  validateBackupSize,
  createBackup,
  downloadBackup,
  parseBackup,
  restoreBackup,
  type PlayerBackup,
} from './backup';

beforeEach(resetLocalSave);

const result: GameResult = {
  answers: [
    {
      category: 'identity',
      cluesUsed: 0,
      correct: true,
      points: 1000,
      questionType: 'pokedex-scan',
      responseMilliseconds: 1500,
      speedBonus: 2000,
      subject: {
        kind: 'pokemon' as const,
        generation: 'I',
        name: 'pikachu',
      },
    },
  ],
  contentVersion: 8,
  correctCount: 1,
  elapsedMilliseconds: 1500,
  elapsedSeconds: 1,
  questionCount: 1,
  score: 5000,
  scoreVersion: 3,
};

const populate = async () => {
  await commitRoundCompletion(
    completion(crypto.randomUUID(), 'daily', {
      dailyDate: '2026-09-07',
      completedAt: '2026-09-07T12:00:00.000Z',
    }),
  );
  await commitRoundCompletion(completion(crypto.randomUUID(), 'league'));
  await commitRoundCompletion(completion(crypto.randomUUID(), 'training'));
  await updatePlayerData({
    profile: {
      ...createTrainerProfile(),
      name: 'Leaf',
      partnerPokemon: 'pikachu',
      specialty: 'identity',
      hasBeenRevealed: true,
    },
    generationPromptAnswered: true,
    settings: {
      ...defaultGameSettings,
      answerFlow: 'auto',
      reduceMotion: true,
      soundVolume: 0.4,
      timerDisplay: 'milliseconds',
      trainingMode: 'custom',
      generations: ['I', 'II'],
      questionTypes: ['pokedex-scan', 'generation-roundup'],
    },
  });
};

const active = async (
  overrides: Partial<Parameters<typeof writeActiveGame>[0]> = {},
) =>
  await writeActiveGame({
    answers: [],
    contentVersion: 8,
    elapsedMilliseconds: 100,
    mode: { kind: 'training' },
    settings: defaultGameSettings,
    questionCount: 10,
    questions: buildQuestions(
      catalog,
      defaultGameSettings,
      createSeededRandom('saved-round'),
    ),
    seed: 'unfinished',
    roundId: crypto.randomUUID(),
    ...overrides,
  });
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('account backups', () => {
  afterEach(async () => {
    await transactPlayer((state) => {
      delete state.account;
      delete state.editRevisions;
    });
  });
  async function prepareAccountBackup() {
    const db = getPlayerDatabase();
    for (const sql of [
      'CREATE TABLE IF NOT EXISTS pending_actions(id TEXT PRIMARY KEY,payload TEXT,sequence INTEGER)',
      'CREATE TABLE IF NOT EXISTS sync_issues(id TEXT PRIMARY KEY,owner_id TEXT,generation_id TEXT,operation_id TEXT,reason TEXT,payload TEXT,dismissed INTEGER)',
      'CREATE TABLE IF NOT EXISTS account_state(id TEXT PRIMARY KEY,generation_id TEXT,revision INTEGER,edits TEXT,edit_revisions TEXT)',
      'CREATE TABLE IF NOT EXISTS completion_facts(id TEXT PRIMARY KEY,completion_id TEXT,generation_id TEXT,revision INTEGER,eligible INTEGER,completion TEXT)',
      'DELETE FROM completion_facts',
      'DELETE FROM pending_actions',
      'DELETE FROM sync_issues',
      'DELETE FROM account_state',
    ])
      await db.execute(sql);
    const account = {
      id: 'backup-account',
      generationId: crypto.randomUUID(),
      serverEpoch: crypto.randomUUID(),
    };
    await transactPlayer((state) => {
      state.account = account;
    });
    return { db, account };
  }

  it('exports downloaded conflict details and preserves them when reading an account backup', async () => {
    const { db, account } = await prepareAccountBackup();
    const operationId = crypto.randomUUID();
    const payload = {
      unit: 'name',
      value: 'Other device',
      expectedRevision: 0,
    };
    await db.execute('INSERT INTO sync_issues VALUES (?,?,?,?,?,?,?)', [
      crypto.randomUUID(),
      account.id,
      account.generationId,
      operationId,
      'edit_conflict',
      JSON.stringify(payload),
      0,
    ]);
    const backup = await createBackup();
    expect(backup.reviewIssues).toEqual([
      { operationId, reason: 'edit_conflict', payload },
    ]);
    expect(parseBackup(JSON.stringify(backup))).toMatchObject({
      reviewIssues: backup.reviewIssues,
    });
    await restoreBackup(backup);
    expect(await db.getAll('SELECT * FROM pending_actions')).toHaveLength(0);
    expect(await db.getAll('SELECT * FROM sync_issues')).toHaveLength(1);
  });

  it('recovers a pending dismissal once, with its original identity', async () => {
    const { db } = await prepareAccountBackup();
    const action = await transactPlayer((state, tx) =>
      appendLocalAction(state, tx, 'issue.dismiss', crypto.randomUUID()),
    );
    const backup = await createBackup();
    expect(() => parseBackup(JSON.stringify(backup))).not.toThrow();
    await db.execute('DELETE FROM pending_actions');
    await db.execute('DELETE FROM local_actions');
    await restoreBackup(backup);
    await restoreBackup(backup);
    const rows = await db.getAll<{ id: string; payload: string }>(
      'SELECT id,payload FROM pending_actions',
    );
    expect(rows).toEqual([
      { id: action.operationId, payload: JSON.stringify(action) },
    ]);
  });

  it('rejects malformed dismissal targets and account review metadata', async () => {
    await prepareAccountBackup();
    await transactPlayer((state, tx) =>
      appendLocalAction(state, tx, 'issue.dismiss', 'not-an-issue-id'),
    );
    const invalidAction = await createBackup();
    expect(() => parseBackup(JSON.stringify(invalidAction))).toThrow(
      'unsupported or mismatched action',
    );
    const backup = {
      ...invalidAction,
      records: {
        ...invalidAction.records,
        local_actions: [],
        pending_actions: [],
      },
    };
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...backup,
          reviewIssues: [{ operationId: 'invalid' }],
        }),
      ),
    ).toThrow('invalid account review details');
    const guest = structuredClone(backup.state);
    delete guest.account;
    expect(() =>
      parseBackup(
        JSON.stringify({ ...backup, state: guest, reviewIssues: [] }),
      ),
    ).toThrow('invalid account review details');
  });
});

it.each([
  [null, ''],
  ['', ''],
  ['Leaf', 'Leaf-'],
  ['Leaf / Red', 'Leaf-Red-'],
  ['Élodie', 'Élodie-'],
  ['<>:"/\\|?*', ''],
])('uses a filename-safe chosen Trainer name: %s', async (name, expected) => {
  if (name !== null)
    await updatePlayerData({ profile: { ...createTrainerProfile(), name } });
  let filename = '';
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download;
  });
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:backup',
    revokeObjectURL: vi.fn(),
  });
  vi.useFakeTimers();
  try {
    await downloadBackup();
    expect(filename).toBe(
      `quizmon-backup-${expected}${new Date().toISOString().slice(0, 10)}.json`,
    );
    vi.runAllTimers();
  } finally {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});

it('round-trips every portable field and replaces rather than merges progress', async () => {
  await populate();
  const backup = parseBackup(JSON.stringify(await createBackup()));
  expect(backup.state.save.data.profile?.name).toBe('Leaf');
  await saveResult({ kind: 'daily', date: '2026-09-06' }, result);
  localStorage.setItem('quizmon.daily-reminder-subscription.v1', 'device-only');
  localStorage.setItem(
    'quizmon.daily-reminder-prompt.v1',
    '{"version":1,"completedDailyCount":2}',
  );
  localStorage.setItem(
    'quizmon.daily-reminder-last-completed.v1',
    '2026-09-06',
  );
  localStorage.setItem('unrelated', 'keep');
  await active();
  expect(readActiveGame(catalog)).not.toBeNull();
  await restoreBackup(backup);
  expect(readPlayerSave().data).toEqual(backup.state.save.data);
  expect(readPlayerSave().restoreId).not.toBeNull();
  expect(readDailyResult('2026-09-06')).toBeNull();
  expect(readActiveGame(catalog)).toBeNull();
  expect(localStorage.getItem('quizmon.daily-reminder-subscription.v1')).toBe(
    'device-only',
  );
  expect(localStorage.getItem('quizmon.daily-reminder-prompt.v1')).toContain(
    '"completedDailyCount":2',
  );
  expect(localStorage.getItem('quizmon.daily-reminder-last-completed.v1')).toBe(
    '2026-09-06',
  );
  expect(localStorage.getItem('unrelated')).toBe('keep');
  expect(JSON.stringify(backup)).not.toContain('device-only');
});

it.for<(backup: PlayerBackup) => void>([
  (backup) => Object.assign(backup, { format: 'other-app' }),
  (backup) => Object.assign(backup, { version: 99 }),
  (backup) => {
    if (backup.version === 3) backup.state.datasetId = 'broken';
  },
  (backup) => {
    if (backup.version === 3) backup.state.predecessors.name = 'broken';
  },
  (backup) => {
    if (backup.version === 3)
      backup.records.local_completions.push({
        id: crypto.randomUUID(),
        payload: JSON.stringify({ hash: 'broken', outcome: {} }),
      });
  },
  (backup) => Object.assign(backup, { exportedAt: '2026-02-30T12:00:00.000Z' }),
  (backup) => Object.assign(backup.state.save, { version: 99 }),
  (backup) =>
    Object.assign(backup.state.save.data, {
      settings: { ...defaultGameSettings, soundVolume: 9 },
    }),
  (backup) =>
    Object.assign(backup.state.save.data.results, {
      daily: {
        '2026-09-07': {
          ...result,
          answers: [
            {
              ...result.answers[0],
              subject: { ...result.answers[0]?.subject, generation: 'X' },
            },
          ],
        },
      },
    }),
  (backup) =>
    Object.assign(backup.state.save.data, {
      profile: { ...backup.state.save.data.profile, partnerPokemon: 99 },
    }),
  (backup) =>
    Object.assign(backup.state.save.data.results.progress, {
      correctCategories: { identity: -1 },
    }),
])('rejects invalid imports without changing storage (%#)', async (damage) => {
  await populate();
  const before = readPlayerSave();
  const backup = await createBackup();
  damage(backup);
  expect(() => parseBackup(JSON.stringify(backup))).toThrow();
  expect(readPlayerSave()).toEqual(before);
});
it.for([[], ['unknown'], null, 'I'])(
  'rejects invalid backup selections without changing storage: %j',
  async (value) => {
    await populate();
    const before = readPlayerSave();
    for (const field of ['generations', 'questionTypes']) {
      const backup = await createBackup();
      backup.state.save.data.settings = {
        ...defaultGameSettings,
        [field]: value,
      };
      expect(() => parseBackup(JSON.stringify(backup))).toThrow();
      expect(readPlayerSave()).toEqual(before);
    }
  },
);
it('rejects malformed JSON and oversized files', () => {
  expect(() => parseBackup('{')).toThrow('valid JSON');
  expect(() => validateBackupSize(MAX_BACKUP_BYTES + 1)).toThrow('too large');
});

it('rejects pre-release backups without changing progress', () => {
  const before = readPlayerSave();
  expect(() =>
    parseBackup(
      JSON.stringify({
        format: 'quizmon-backup',
        version: 1,
        exportedAt: '2026-09-01T00:00:00.000Z',
        save: { ...before, version: 4 },
      }),
    ),
  ).toThrow('unsupported version');
  expect(readPlayerSave()).toEqual(before);
});

it('rolls back every restored record when the transaction fails', async () => {
  const backup = await createBackup();
  await populate();
  await active();
  const before = await createBackup();
  const round = readActiveGame(catalog);
  const db = getPlayerDatabase();
  const write = db.writeTransaction.bind(db);
  vi.spyOn(db, 'writeTransaction').mockImplementation((callback) =>
    write(async (transaction) => {
      await callback(transaction);
      throw new Error('Storage full');
    }),
  );
  await expect(restoreBackup(backup)).rejects.toThrow('Storage full');
  vi.restoreAllMocks();
  const after = await createBackup();
  expect(after.state).toEqual(before.state);
  expect(after.records).toEqual(before.records);
  expect(readActiveGame(catalog)).toEqual(round);
});

it('revalidates a preview and leaves the save unchanged on malformed imports', async () => {
  const backup = await createBackup();
  const before = readPlayerSave();
  backup.state.save.data.results.progress.masteryRounds = -1;
  await expect(restoreBackup(backup)).rejects.toThrow();
  expect(readPlayerSave()).toEqual(before);
});

it('notifies tabs on restore and fences old unfinished rounds', async () => {
  await active();
  const round = readActiveGame(catalog)!;
  const onRestore = vi.fn();
  const unsubscribe = subscribeToPlayerRestore(onRestore);
  await updatePlayerData({ generationPromptAnswered: true });
  expect(onRestore).not.toHaveBeenCalled();
  await restoreBackup(await createBackup());
  expect(onRestore).toHaveBeenCalledTimes(1);
  await expect(writeActiveGame(round)).rejects.toThrow('restored a save');
  expect(readActiveGame(catalog)).toBeNull();
  unsubscribe();
});

it('rejects mismatched action identities in a new backup', async () => {
  await updatePlayerData({
    profile: { ...createTrainerProfile(), name: 'Leaf' },
  });
  const backup = await createBackup();
  backup.records.local_actions[0]!.id = crypto.randomUUID();
  expect(() => parseBackup(JSON.stringify(backup))).toThrow(
    'mismatched action',
  );
});

it('preserves temporarily unavailable custom families through backup restore', async () => {
  const backup = await createBackup();
  backup.state.save.data.settings = {
    ...defaultGameSettings,
    difficulty: 3,
    questionSelection: 'custom',
    generations: ['II'],
    questionTypes: ['generation-roundup'],
  };
  await restoreBackup(backup);
  expect(readPlayerSave().data.settings).toMatchObject(
    backup.state.save.data.settings,
  );
});

it.each(['baby-pokemon', 'battle-view', 'evolution-order'])(
  'rejects a retired question type without changing the current save: %s',
  async (questionType) => {
    await populate();
    const before = readPlayerSave();
    const data = structuredClone(before.data);
    const daily = Object.values(data.results.daily)[0]!;
    const raw = JSON.stringify({
      ...before,
      data: {
        ...data,
        results: {
          ...data.results,
          daily: {
            '2026-09-07': {
              ...daily,
              answers: [{ ...daily.answers[0], questionType }],
            },
          },
        },
      },
    });
    localStorage.setItem(PLAYER_STORAGE_KEY, raw);
    await expect(seedStoredFixture()).rejects.toThrow('invalid');
    expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(raw);
    expect(readPlayerSave()).toEqual(before);
  },
);

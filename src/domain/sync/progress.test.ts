import { observeAnswer } from '../quiz/answer-observation.ts';
import { getTrainingScoreMultipliers } from '../quiz/score-multipliers.ts';
import { completion as onlineCompletion } from '../../../tests/online/progress-fixtures.ts';
import { buildDailyForTest } from '../../../tests/fixtures/daily.ts';
import { generations } from '../pokemon/types.ts';
import {
  contribution,
  trainingBestKey,
  validateCompletion,
} from './progress.ts';
import type { GameSettings } from '../settings/types.ts';
import { resolveTrainingSettings } from '../quiz/question-generation.ts';
import { buildDailyTrackQuestions } from '../quiz/question-generation.ts';
import { catalog } from '../../../tests/fixtures/catalog.ts';
import { resetLocalSave } from '../../../tests/fixtures/local-save.ts';
import { createBackup, restoreBackup } from '../../features/settings/backup.ts';
import { createSeededRandom } from '../../lib/random.ts';
import {
  clearActiveGame,
  writeActiveGame,
} from '../../lib/storage/active-game-storage.ts';
import {
  getPlayerDatabase,
  readPlayerData,
  readPlayerSave,
  updatePlayerData,
} from '../../lib/storage/player-storage.ts';
import {
  commitRoundCompletion,
  readLocalRound,
} from '../../lib/storage/round-storage.ts';
import { buildQuestions } from '../quiz/question-generation.ts';
import { getQuestionPokemon } from '../quiz/question-pokemon.ts';
import { snapshotRoundRules } from '../quiz/round-rules.ts';
import {
  SCORE_VERSION,
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getSpeedBonusPoints,
} from '../quiz/scoring.ts';
import type { QuestionData } from '../quiz/types.ts';
import {
  defaultGameSettings,
  getTrainingSettings,
} from '../settings/game-settings.ts';
import { trainingConfig, versions, type RoundCompletion } from './progress.ts';

beforeEach(resetLocalSave);
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const makeCompletion = (
  questions: QuestionData[],
  mode: 'training' | 'daily' = 'training',
  settings: GameSettings = defaultGameSettings,
): Omit<RoundCompletion, 'datasetId'> => {
  const answers = questions.map((question) => {
    const points = getAnswerPoints(question, true, question.initialClues ?? 0);
    return {
      observation: observeAnswer(question, question.answer.correctOptions),
      category: question.category,
      cluesUsed: question.initialClues ?? 0,
      unassistedSearch:
        question.category === 'champion' &&
        (question.answer.interaction === 'search' || !question.rulesVersion) &&
        !question.initialClues,
      correct: true,
      subject: {
        kind: question.subject.kind,
        name: question.subject.name,
        generation: question.subject.generation,
      },
      points,
      questionType: question.questionType,
      responseMilliseconds: 1000,
      speedBonus: getSpeedBonusPoints(points, 1000),
    };
  });
  const scoreMultipliers =
    mode === 'training' ? getTrainingScoreMultipliers(settings) : undefined;
  const scoreVersion = SCORE_VERSION;
  return {
    recordVersion: 1,
    completionId: crypto.randomUUID(),
    contentVersion: catalog.contentVersion,
    scoreVersion,
    progressVersion: versions.progress,
    generatorVersion: 0,
    mode,
    dailyDate: mode === 'daily' ? new Date().toISOString().slice(0, 10) : null,
    training: trainingConfig(settings),
    completedAt: new Date().toISOString(),
    result: {
      ...(snapshotRoundRules(settings, questions)
        ? { rules: snapshotRoundRules(settings, questions) }
        : {}),
      answers,
      contentVersion: catalog.contentVersion,
      correctCount: answers.length,
      questionCount: questions.length,
      score: calculateScore(answers, scoreMultipliers),
      ...(scoreMultipliers ? { scoreMultipliers } : {}),
      scoreVersion,
      ...getResponseTime(answers),
    },
    discoveries: [
      ...new Set(questions.flatMap((question) => getQuestionPokemon(question))),
    ].sort(),
    victory: null,
  };
};
const training = () => {
  const questions = buildQuestions(
    catalog,
    getTrainingSettings(defaultGameSettings),
    createSeededRandom('sqlite-transaction'),
  );
  return { questions, completion: makeCompletion(questions) };
};

it('counts concurrent retries of one completion once and preserves its action through backup restore', async () => {
  const { completion } = training();
  const outcomes = await Promise.all([
    commitRoundCompletion(completion),
    commitRoundCompletion(completion),
  ]);
  expect(outcomes[0]).toEqual(outcomes[1]);
  const before = readPlayerData();
  expect(
    Object.values(before.results.progress.correctCategories).reduce(
      (sum, n) => sum + n,
      0,
    ),
  ).toBe(10);
  const backup = await createBackup();
  expect(backup.records.local_completions).toHaveLength(1);
  expect(
    backup.records.local_actions.filter(
      (row) => row.id === completion.completionId,
    ),
  ).toHaveLength(1);
  await restoreBackup(backup);
  await commitRoundCompletion(completion);
  expect(readPlayerData()).toEqual(before);
  expect((await createBackup()).state.datasetId).toBe(backup.state.datasetId);
});

it('rolls back the completion, discovery union, and active-round cleanup together', async () => {
  const { completion, questions } = training();
  const round = {
    roundId: completion.completionId,
    answers: completion.result.answers.slice(0, 9),
    contentVersion: catalog.contentVersion,
    elapsedMilliseconds: 10000,
    mode: { kind: 'training' as const },
    settings: defaultGameSettings,
    questionCount: 10,
    questions,
    seed: 'rollback',
  };
  await writeActiveGame(round);
  const before = await createBackup();
  const active = readLocalRound();
  const db = getPlayerDatabase();
  const run = db.writeTransaction.bind(db);
  vi.spyOn(db, 'writeTransaction').mockImplementation((callback) =>
    run(async (tx) => {
      await callback(tx);
      throw new Error('Storage full');
    }),
  );
  await expect(commitRoundCompletion(completion)).rejects.toThrow(
    'Storage full',
  );
  const after = await createBackup();
  vi.restoreAllMocks();
  expect(after.state).toEqual(before.state);
  expect(after.records).toEqual(before.records);
  expect(readLocalRound()).toEqual(active);
  await commitRoundCompletion(completion);
  await writeActiveGame(round);
  expect(readLocalRound()).toBeNull();
});

it('rejects conflicting reuse of a completion ID without changing progress', async () => {
  const { completion } = training();
  await commitRoundCompletion(completion);
  const before = readPlayerSave();
  await expect(
    commitRoundCompletion({
      ...completion,
      completedAt: '2026-09-01T00:00:00.000Z',
    }),
  ).rejects.toThrow('different saved result');
  expect(readPlayerSave()).toEqual(before);
});

it('keeps the first Daily result while retaining discoveries from both attempts', async () => {
  const date = new Date().toISOString().slice(0, 10);
  const first = makeCompletion(buildDailyForTest(date), 'daily');
  const second = structuredClone(first);
  second.completionId = crypto.randomUUID();
  const extra = Object.keys(catalog.pokemon).find(
    (name) => !first.discoveries.includes(name),
  )!;
  second.discoveries.push(extra);
  await commitRoundCompletion(first);
  const progress = readPlayerData().results.progress;
  await commitRoundCompletion(second);
  expect(readPlayerData().results.progress).toEqual(progress);
  expect(readPlayerData().pokedex).toContain(extra);
  expect(readPlayerData().results.streak.creditedDates).toEqual([date]);
});

it('preserves independent edits and chains successive edits to the same field', async () => {
  const profile = readPlayerData().profile!;
  await Promise.all([
    updatePlayerData({ profile: { ...profile, name: 'Leaf' } }),
    updatePlayerData({ profile: { ...profile, partnerPokemon: 'pikachu' } }),
  ]);
  expect(readPlayerData().profile).toMatchObject({
    name: 'Leaf',
    partnerPokemon: 'pikachu',
  });
  await updatePlayerData({
    profile: { ...readPlayerData().profile!, name: 'Red' },
  });
  const backup = await createBackup();
  const actions = backup.records.local_actions.map(
    (row) =>
      JSON.parse(row.payload) as {
        operationId: string;
        payload: { unit: string; predecessorId?: string };
      },
  );
  const names = actions.filter((action) => action.payload.unit === 'name');
  expect(names).toHaveLength(2);
  expect(names[1]!.payload.predecessorId).toBe(names[0]!.operationId);
  expect(
    actions.find((action) => action.payload.unit === 'partnerPokemon')!.payload
      .predecessorId,
  ).toBeUndefined();
});

it('does not resurrect an abandoned round when an old timer save arrives late', async () => {
  const { completion, questions } = training();
  const round = {
    roundId: completion.completionId,
    answers: [],
    contentVersion: catalog.contentVersion,
    elapsedMilliseconds: 1000,
    mode: { kind: 'training' as const },
    settings: defaultGameSettings,
    questionCount: 10,
    questions,
    seed: 'left-round',
  };
  await writeActiveGame(round);
  await clearActiveGame();
  await writeActiveGame({ ...round, elapsedMilliseconds: 2000 });
  expect(readLocalRound()).toBeNull();
  expect((await createBackup()).records.local_completions).toHaveLength(0);
});

it('credits the assigned UTC day when committing after midnight', async () => {
  const completion = makeCompletion(buildDailyForTest('2026-09-10'), 'daily');
  completion.dailyDate = '2026-09-10';
  completion.completedAt = '2026-09-10T23:59:59.900Z';
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-11T00:00:00.300Z'));
  await commitRoundCompletion(completion);
  expect(readPlayerData().results.streak.creditedDates).toEqual(['2026-09-10']);
});

it('records a completed round before the player advances past final feedback', async () => {
  const { completion, questions } = training();
  await writeActiveGame({
    roundId: completion.completionId,
    answers: completion.result.answers,
    completedAt: completion.completedAt,
    contentVersion: catalog.contentVersion,
    elapsedMilliseconds: completion.result.elapsedMilliseconds,
    mode: { kind: 'training' },
    settings: defaultGameSettings,
    questionCount: questions.length,
    questions,
    seed: 'final-feedback',
    scoreMultipliers: completion.result.scoreMultipliers,
  });
  const saved = await createBackup();
  expect(saved.records.local_completions).toHaveLength(1);
  expect(readLocalRound()?.answers).toHaveLength(10);
  await commitRoundCompletion(completion);
  expect((await createBackup()).records.local_completions).toEqual(
    saved.records.local_completions,
  );
  expect(readPlayerData()).toEqual(saved.state.save.data);
  expect(readLocalRound()).toBeNull();
});

it('saves a Champion answer after showing choices and all three clues', async () => {
  const date = new Date().toISOString().slice(0, 10);
  const questions = buildDailyForTest(date);
  const completion = makeCompletion(questions, 'daily');
  const champion = completion.result.answers.at(-1)!;
  champion.cluesUsed = questions.at(-1)!.clues!.length + 1;
  champion.unassistedSearch = false;
  expect(champion.cluesUsed).toBe(4);
  champion.points = getAnswerPoints(champion, true, champion.cluesUsed);
  champion.speedBonus = getSpeedBonusPoints(
    champion.points,
    champion.responseMilliseconds!,
  );
  completion.result.score = calculateScore(completion.result.answers);
  await commitRoundCompletion(completion);
  expect(readPlayerData().results.daily[date]?.answers.at(-1)?.cluesUsed).toBe(
    4,
  );

  const invalid = structuredClone(completion);
  invalid.completionId = crypto.randomUUID();
  invalid.result.answers.at(-1)!.cluesUsed = 5;
  await expect(commitRoundCompletion(invalid)).rejects.toThrow(
    'invalid_answer',
  );
  expect((await createBackup()).records.local_completions).toHaveLength(1);
});

it('keeps difficulty and form selections in preferences and shares the Training best by scoring version', async () => {
  const completions = [];
  for (const difficulty of [1, 5] as const) {
    const settings = resolveTrainingSettings(catalog, {
      ...defaultGameSettings,
      difficulty,
      formGroups: ['standard'],
      questionSelection: 'custom',
      questionTypes: ['type-check'],
    });
    await updatePlayerData({ settings });
    const questions = buildQuestions(
      catalog,
      settings,
      createSeededRandom(`sync-level-${difficulty}`),
    );
    const completion = makeCompletion(questions, 'training', settings);
    await commitRoundCompletion(completion);
    completions.push(completion);
  }
  const backup = await createBackup();
  const edits = backup.records.local_actions
    .map(
      (row) =>
        JSON.parse(row.payload) as {
          payload: { unit?: string; value?: unknown };
        },
    )
    .filter((action) => action.payload.unit === 'training');
  expect(edits.at(-1)?.payload.value).toMatchObject({
    difficulty: 5,
    formGroups: ['standard'],
    questionSelection: 'custom',
    questionTypes: ['type-check'],
  });
  expect(Object.keys(backup.state.save.data.results.training)).toHaveLength(1);
  for (const completion of completions) {
    const record = { ...completion, datasetId: backup.state.datasetId };
    expect(validateCompletion(record)).toBeNull();
    expect(
      backup.state.save.data.results.training[trainingBestKey(record)]?.rules
        ?.difficulty,
    ).toBe(completions[1]!.training.difficulty);
    expect(contribution(record).masteryRounds).toBe(0);
    expect(contribution(record).quickAttackRounds).toBe(0);
  }
});

it.each([1, 2, 3, 4, 5] as const)(
  'imports tracked Daily progress and applies Level %i Champion qualification',
  async (difficulty) => {
    const date = new Date().toISOString().slice(0, 10);
    const settings = resolveTrainingSettings(catalog, {
      ...defaultGameSettings,
      difficulty,
      generations: [...generations],
    });
    const questions = buildDailyTrackQuestions(catalog, date, settings, 'all');
    const completion = makeCompletion(questions, 'daily', settings);
    completion.result.dailyTrack = { difficulty, scope: 'all' };
    await commitRoundCompletion(completion);
    const record = {
      ...completion,
      datasetId: (await createBackup()).state.datasetId,
    };
    expect(validateCompletion(record)).toBeNull();
    expect(contribution(record).championAnswersWithoutClues).toBe(
      difficulty < 3 ? 0 : 1,
    );
    const save = readPlayerSave();
    expect(save.data.results.daily[`${date}:${difficulty}:all`]).toBeDefined();
    expect(save.data.results.streak.creditedDates).toContain(date);
  },
);

it('rejects pre-reset completion versions without rewriting their evidence', () => {
  const round = {
    ...onlineCompletion(crypto.randomUUID()),
    contentVersion: 17,
    scoreVersion: 3,
    progressVersion: 2,
  };
  round.result.contentVersion = 17;
  round.result.scoreVersion = 2;
  const original = JSON.stringify(round);
  expect(validateCompletion(round)).toBe('unsupported_version');
  expect(JSON.stringify(round)).toBe(original);
  expect(validateCompletion({ ...round, progressVersion: '2' })).toBe(
    'unsupported_version',
  );
  expect(
    validateCompletion({ ...round, contentVersion: round.contentVersion - 1 }),
  ).toBe('unsupported_version');
  expect(validateCompletion({ ...round, recordVersion: 999 })).toBe(
    'unsupported_version',
  );
  expect(validateCompletion({ ...round, generatorVersion: 999 })).toBe(
    'unsupported_version',
  );
});

it('accepts the post-reset completion versions after future game updates', () => {
  const round = onlineCompletion(crypto.randomUUID());
  round.recordVersion = 1;
  round.contentVersion = 18;
  round.scoreVersion = 3;
  round.progressVersion = 3;
  round.generatorVersion = 0;
  round.result.contentVersion = 18;
  round.result.scoreVersion = 3;
  expect(validateCompletion(round)).toBeNull();
});

it('preserves weighted results with item, move, and region subjects through final-answer recovery and backup', async () => {
  const { createQuestionContext } =
    await import('../../../tests/fixtures/catalog.ts');
  const { buildQuestionType } = await import('../quiz/questions/registry.ts');
  const types = [
    'item-identification',
    'move-types',
    'name-that-region',
  ] as const;
  const settings: GameSettings = {
    ...defaultGameSettings,
    difficulty: 3,
    generations: [...generations],
    questionSelection: 'custom',
    questionTypes: [...types],
  };
  const questions = Array.from({ length: 10 }, (_, index) =>
    buildQuestionType(
      { ...createQuestionContext(`typed-completion-${index}`), difficulty: 3 },
      types[index % types.length]!,
    )!,
  );
  const completion = makeCompletion(questions, 'training', settings);
  expect(
    new Set(completion.result.answers.map((answer) => answer.subject?.kind)),
  ).toEqual(new Set(['item', 'move', 'location']));
  await writeActiveGame({
    roundId: completion.completionId,
    questions,
    answers: completion.result.answers,
    completedAt: completion.completedAt,
    contentVersion: catalog.contentVersion,
    elapsedMilliseconds: completion.result.elapsedMilliseconds,
    mode: { kind: 'training' },
    settings,
    questionCount: 10,
    seed: 'typed-completion',
    scoreMultipliers: completion.result.scoreMultipliers,
  });
  await commitRoundCompletion(completion);
  const backup = await createBackup();
  const recorded = { ...completion, datasetId: backup.state.datasetId };
  expect(validateCompletion(recorded)).toBeNull();
  expect(backup.records.local_completions).toHaveLength(1);
  expect(backup.state.save.data.results.training['score:3']).toEqual(
    completion.result,
  );
  expect(backup.state.save.data.pokedex).toEqual([]);
  await restoreBackup(backup);
  expect(readPlayerSave().data.results.training['score:3']).toEqual(
    completion.result,
  );
  const invalid = structuredClone(recorded);
  delete invalid.result.scoreMultipliers;
  expect(validateCompletion(invalid)).toBe('invalid_score');
});

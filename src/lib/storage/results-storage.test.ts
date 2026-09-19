import { resetLocalSave } from '../../../tests/fixtures/local-save';
beforeEach(resetLocalSave);
import { emptyPlayerData } from '../../domain/player/player-save';
import { updatePlayerData, getPlayerDatabase } from './player-storage';
import { correctAnswer, result } from '../../../tests/fixtures/result';
import type { GameResult } from '../../domain/quiz/types';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { readPlayerData } from './player-storage';
import { dailyTracks } from '../../domain/quiz/daily-track';
import { createBackup, parseBackup } from '../../features/settings/backup';
import {
  readDailyResult,
  readDailyStreak,
  readCompletedDailyCount,
  readTrainerStats,
  saveResult,
} from './results-storage';
describe('saved results', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.useRealTimers());
  it('shares one Training best across settings', async () => {
    const mode = { kind: 'training' } as const;
    const weighted: GameResult = {
      ...result,
      scoreVersion: 3,
      score: 500,
      scoreMultipliers: {
        difficulty: 1,
        generations: 1,
        questionTypes: [{ questionType: 'sprite-match', multiplier: 0.75 }],
      },
      rules: {
        version: 1,
        difficulty: 1,
        generations: ['I'],
        formGroups: ['standard'],
        questionTypes: ['sprite-match'],
      },
    };
    expect(await saveResult(mode, weighted)).toMatchObject({
      best: weighted,
      isNewBest: true,
    });
    const other: GameResult = {
      ...weighted,
      contentVersion: weighted.contentVersion + 1,
      score: 400,
      rules: {
        ...weighted.rules!,

        difficulty: 5,
        generations: ['I', 'II'],
        formGroups: ['standard', 'regional'],
      },
    };
    expect(await saveResult(mode, other)).toMatchObject({
      best: weighted,
      isNewBest: false,
    });
    const record = { ...other, score: 600 };
    expect(await saveResult(mode, record)).toMatchObject({
      best: record,
      isNewBest: true,
      isSaved: true,
    });
    expect(readPlayerData().results.training['score:3']).toEqual(record);
    expect(Object.keys(readPlayerData().results.training)).toHaveLength(1);
    expect(
      parseBackup(JSON.stringify(await createBackup())).save.data.results,
    ).toEqual(readPlayerData().results);
    const malformed = await createBackup();
    malformed.save.data.results.training[
      'score:3'
    ]!.scoreMultipliers!.generations = 10;
    expect(() => parseBackup(JSON.stringify(malformed))).toThrow();
  });
  it('credits ten independent tracks, but only one shared combo day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
    for (const track of dailyTracks) {
      const mode = { kind: 'daily' as const, date: '2026-09-12', track };
      expect(await saveResult(mode, result)).toMatchObject({
        isSaved: true,
        isNewBest: true,
      });
      expect(readDailyResult(mode.date, track)).toEqual({
        ...result,
        dailyTrack: track,
      });
      const progress = readTrainerStats();
      expect(await saveResult(mode, { ...result, score: 9999 })).toMatchObject({
        isSaved: true,
        isNewBest: false,
      });
      expect(readTrainerStats()).toEqual(progress);
      expect(readDailyStreak('2026-09-12')).toBe(1);
    }
    expect(Object.keys(readPlayerData().results.daily)).toHaveLength(10);
    expect(readPlayerData().results.streak.creditedDates).toEqual([
      '2026-09-12',
    ]);
    expect(readCompletedDailyCount()).toBe(1);
    expect(
      parseBackup(JSON.stringify(await createBackup())).save.data.results,
    ).toEqual(readPlayerData().results);
    vi.setSystemTime(new Date('2026-09-13T12:00:00Z'));
    await saveResult(
      { kind: 'daily', date: '2026-09-13', track: dailyTracks[9] },
      result,
    );
    expect(readDailyStreak('2026-09-13')).toBe(2);
  });
  it('preserves a legacy Daily result alongside new tracks', async () => {
    const date = '2026-09-12';
    await saveResult({ kind: 'daily', date }, result);
    const track = dailyTracks[0]!;
    await saveResult({ kind: 'daily', date, track }, { ...result, score: 10 });
    expect(readDailyResult(date)).toEqual(result);
    expect(readDailyResult(date, track)?.score).toBe(10);
    expect(Object.keys(readPlayerData().results.daily)).toHaveLength(2);
  });
  it('records a daily result once and restores it', async () => {
    const mode = { kind: 'daily', date: '2026-09-01' } as const;
    expect(await saveResult(mode, result)).toEqual({
      best: result,
      isNewBest: true,
      isSaved: true,
    });
    expect(readDailyResult(mode.date)).toEqual(result);
  });
  it('never overwrites the first daily attempt', async () => {
    const mode = { kind: 'daily', date: '2026-09-01' } as const;
    await saveResult(mode, result);
    const progressBeforeRetry = readTrainerStats();
    const perfect = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: true,
        points: 1000,
      })),
      correctCount: 2,
      score: 4000,
    };
    expect(await saveResult(mode, perfect)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
    expect(readDailyResult(mode.date)).toEqual(result);
    expect(readTrainerStats()).toEqual(progressBeforeRetry);
  });
  it('keeps one Daily best across challenge dates', async () => {
    await saveResult({ kind: 'daily', date: '2026-09-01' }, result);
    const lower = { ...result, score: 500 };
    expect(
      await saveResult({ kind: 'daily', date: '2026-09-02' }, lower),
    ).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
  });
  it('only credits new results completed on their local challenge date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-03T12:00:00.000Z'));
    await saveResult({ kind: 'daily', date: '2026-09-01' }, result);
    expect(readDailyStreak('2026-09-03')).toBe(0);
    const zeroScore = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: false,
        points: 0,
      })),
      correctCount: 0,
      score: 0,
    };
    await saveResult({ kind: 'daily', date: '2026-09-03' }, zeroScore);
    expect(readDailyStreak('2026-09-03')).toBe(1);
  });
  it("keeps yesterday's streak active and crosses a year boundary", async () => {
    await updatePlayerData({
      results: {
        ...emptyPlayerData().results,
        daily: {
          '2025-12-31': result,
          '2026-01-01': result,
        },
        streak: {
          creditedDates: ['2025-12-31', '2026-01-01'],
        },
        training: {},
      },
    });
    expect(readDailyStreak('2026-01-02')).toBe(2);
    expect(readDailyStreak('2026-01-03')).toBe(0);
  });
  it('keeps one League Training best across knowledge configurations', async () => {
    const mode = { kind: 'training' } as const;
    await saveResult(mode, result, defaultGameSettings);
    const lower = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: false,
        points: 0,
      })),
      correctCount: 0,
      score: 0,
    };
    expect(await saveResult(mode, lower, defaultGameSettings)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
    expect(
      await saveResult(mode, lower, {
        ...defaultGameSettings,
        generations: ['I'],
      }),
    ).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
    const longer: GameResult = {
      ...result,
      answers: [
        ...result.answers,
        {
          category: 'type',
          cluesUsed: 0,
          correct: true,
          points: 1000,
          questionType: 'type-check',
          subject: {
            kind: 'pokemon' as const,
            generation: 'III',
            name: 'rayquaza',
          },
        },
      ],
      correctCount: 2,
      questionCount: 3,
    };
    expect(
      (await saveResult(mode, longer, defaultGameSettings)).isNewBest,
    ).toBe(false);
  });
  it('compares Training bests across preset and custom selections', async () => {
    await saveResult({ kind: 'training' }, result, defaultGameSettings);
    const customResult = { ...result, score: 500 };
    expect(
      await saveResult({ kind: 'training' }, customResult, {
        ...defaultGameSettings,
        trainingMode: 'custom',
      }),
    ).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
  });
  it('builds Trainer progression from correct answers', async () => {
    const perfect = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: true,
        points: 1000,
      })),
      correctCount: result.questionCount,
    };
    await saveResult({ kind: 'training' }, perfect, defaultGameSettings);
    expect(readTrainerStats()).toMatchObject({
      correctCategories: {
        identity: 1,
        stat: 1,
      },
      correctPokemon: ['pikachu', 'sudowoodo'],
      masteryRounds: 0,
      quickAttackCompleted: false,
    });
  });
  it('tracks League mastery without rewarding perfect Quick rounds', async () => {
    const perfectAnswers: GameResult['answers'] = Array.from(
      { length: 10 },
      (_, index) => ({
        ...correctAnswer,
        category: index === 9 ? 'champion' : 'identity',
        questionType: index === 9 ? 'champion' : 'pokedex-scan',
        subject: {
          ...correctAnswer.subject,
          kind: 'pokemon' as const,
          generation: index % 2 === 0 ? 'I' : 'II',
          name: `pokemon-${index}`,
        },
      }),
    );
    const standard = {
      ...result,
      answers: perfectAnswers,
      correctCount: 10,
      questionCount: 10,
    };
    const quick = {
      ...standard,
      answers: perfectAnswers.slice(0, 5),
      correctCount: 5,
      questionCount: 5,
    };
    await saveResult({ kind: 'training' }, quick, defaultGameSettings);
    expect(readTrainerStats().masteryRounds).toBe(0);
    await saveResult({ kind: 'training' }, standard, defaultGameSettings);
    expect(readTrainerStats()).toMatchObject({
      championAnswersWithoutClues: 1,
      correctGenerations: { I: 8, II: 7 },
      correctPokemon: perfectAnswers.map(({ subject }) => subject?.name),
      correctQuestionTypes: { 'pokedex-scan': 14 },
      masteryRounds: 1,
      quickAttackCompleted: true,
    });
  });
  it('keeps knowledge progress but pauses performance badges under custom rules', async () => {
    const answers = Array.from({ length: 10 }, (_, index) => ({
      ...correctAnswer,
      subject: {
        ...correctAnswer.subject,
        kind: 'pokemon' as const,
        name: `pokemon-${index}`,
      },
    }));
    const perfect = {
      ...result,
      answers,
      correctCount: 10,
      elapsedSeconds: 30,
      questionCount: 10,
    };
    await saveResult({ kind: 'training' }, perfect, {
      ...defaultGameSettings,
      questionTypes: ['pokedex-scan'],
      trainingMode: 'custom',
    });
    expect(readTrainerStats()).toMatchObject({
      correctPokemon: answers.map(({ subject }) => subject?.name),
      masteryRounds: 0,
      quickAttackCompleted: false,
    });
  });
  it('requires both speed and accuracy for Quick Attack', async () => {
    const answers = Array.from({ length: 10 }, (_, index) => ({
      ...correctAnswer,
      correct: index < 8,
      points: index < 8 ? 1000 : 0,
      subject: {
        ...correctAnswer.subject,
        kind: 'pokemon' as const,
        name: `pokemon-${index}`,
      },
    }));
    const standard = {
      ...result,
      answers,
      correctCount: 8,
      elapsedSeconds: 59,
      questionCount: 10,
    };
    await saveResult(
      { kind: 'training' },
      { ...standard, elapsedSeconds: 60 },
      defaultGameSettings,
    );
    expect(readTrainerStats().quickAttackCompleted).toBe(false);
    await saveResult(
      { kind: 'training' },
      {
        ...standard,
        answers: answers.map((answer, index) => ({
          ...answer,
          correct: index < 7,
          points: index < 7 ? 1000 : 0,
        })),
        correctCount: 7,
      },
      defaultGameSettings,
    );
    expect(readTrainerStats().quickAttackCompleted).toBe(false);
    await saveResult({ kind: 'training' }, standard, defaultGameSettings);
    expect(readTrainerStats().quickAttackCompleted).toBe(true);
  });
  it('awards League completion only for a perfect clear', async () => {
    const answers = Array.from({ length: 15 }, (_, index) => ({
      ...correctAnswer,
      subject: {
        ...correctAnswer.subject,
        kind: 'pokemon' as const,
        name: `league-${index}`,
      },
    }));
    const leagueResult = {
      ...result,
      answers,
      correctCount: 15,
      questionCount: 15,
    };
    await saveResult(
      { kind: 'league' },
      {
        ...leagueResult,
        answers: [answers[0]!, { ...answers[1]!, correct: false, points: 0 }],
        correctCount: 1,
      },
      defaultGameSettings,
    );
    expect(readTrainerStats().leagueCompleted).toBe(false);
    await saveResult(
      { kind: 'league' },
      {
        ...leagueResult,
        answers: answers.slice(0, 14),
        correctCount: 14,
        questionCount: 14,
      },
      defaultGameSettings,
    );
    expect(readTrainerStats().leagueCompleted).toBe(false);
    await saveResult({ kind: 'league' }, leagueResult, defaultGameSettings);
    expect(readTrainerStats().leagueCompleted).toBe(true);
  });
  it('leaves results unchanged when the database transaction fails', async () => {
    const before = readPlayerData();
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
    try {
      await expect(
        saveResult({ kind: 'daily', date: '2026-09-01' }, result),
      ).rejects.toThrow('Storage full');
      expect(readPlayerData()).toEqual(before);
    } finally {
      write.mockRestore();
    }
  });
});
it('counts qualifying Quick Attack rounds without counting Custom or slow rounds', async () => {
  window.localStorage.clear();
  const fast = {
    ...result,
    answers: Array.from({ length: 10 }, () => correctAnswer),
    correctCount: 10,
    questionCount: 10,
    elapsedSeconds: 59,
  };
  await saveResult({ kind: 'training' }, fast, {
    ...defaultGameSettings,
    trainingMode: 'league',
  });
  await saveResult({ kind: 'training' }, fast, {
    ...defaultGameSettings,
    trainingMode: 'league',
  });
  await saveResult({ kind: 'training' }, fast, {
    ...defaultGameSettings,
    trainingMode: 'custom',
  });
  await saveResult(
    { kind: 'training' },
    { ...fast, elapsedSeconds: 60 },
    { ...defaultGameSettings, trainingMode: 'league' },
  );
  expect(readTrainerStats().quickAttackRounds).toBe(2);
});
it('qualifies equivalent custom Training at Level 1 and rejects a narrowed family configuration', async () => {
  localStorage.clear();
  const families = [
    'pokedex-scan',
    'sprite-match',
    'type-check',
    'type-matchup',
  ] as const;
  const round: GameResult = {
    ...result,
    rules: {
      version: 1,
      difficulty: 1,
      generations: ['I'],
      formGroups: ['standard'],
      questionTypes: [...families],
      automaticQuestionTypes: [...families],
    },
    answers: Array.from({ length: 10 }, () => ({ ...correctAnswer })),
    questionCount: 10,
    correctCount: 10,
    elapsedSeconds: 40,
  };
  await saveResult({ kind: 'training' }, round, {
    ...defaultGameSettings,
    trainingMode: 'custom',
    questionSelection: 'custom',
  });
  expect(readTrainerStats()).toMatchObject({
    masteryRounds: 1,
    quickAttackRounds: 1,
  });
  await saveResult(
    { kind: 'training' },
    { ...round, rules: { ...round.rules!, questionTypes: ['pokedex-scan'] } },
    defaultGameSettings,
  );
  expect(readTrainerStats()).toMatchObject({
    masteryRounds: 1,
    quickAttackRounds: 1,
  });
});
it('credits only an explicitly unassisted new Champion search answer', async () => {
  localStorage.clear();
  const champion = {
    ...correctAnswer,
    category: 'champion' as const,
    questionType: 'champion' as const,
  };
  await saveResult(
    { kind: 'training' },
    { ...result, answers: [{ ...champion, unassistedSearch: false }] },
  );
  expect(readTrainerStats().championAnswersWithoutClues).toBe(0);
  await saveResult(
    { kind: 'training' },
    { ...result, answers: [{ ...champion, unassistedSearch: true }] },
  );
  expect(readTrainerStats().championAnswersWithoutClues).toBe(1);
});

import {
  canPersistResults,
  getTrainingRecordKey,
  readDailyResult,
  readDailyStreak,
  readTrainerStats,
  saveResult,
} from '@/game/storage';
import { defaultModifiers } from '@/game/game';
import type { GameResult } from '@/game/types';

const result: GameResult = {
  answers: [
    {
      category: 'identity',
      cluesUsed: 0,
      correct: true,
      generation: 'I',
      points: 1_000,
      questionType: 'pokedex-scan',
    },
    {
      category: 'stat',
      cluesUsed: 0,
      correct: false,
      generation: 'II',
      points: 0,
      questionType: 'stat-showdown',
    },
  ],
  contentVersion: 2,
  correctCount: 1,
  elapsedSeconds: 20,
  questionCount: 2,
  score: 1_500,
  scoreVersion: 2,
};

describe('saved results', () => {
  beforeEach(() => window.localStorage.clear());

  afterEach(() => vi.useRealTimers());

  it('records a daily result once and restores it', () => {
    const mode = { kind: 'daily', date: '2026-09-01' } as const;
    expect(saveResult(mode, result)).toEqual({
      best: result,
      isNewBest: true,
      isSaved: true,
    });
    expect(readDailyResult(mode.date)).toEqual(result);
  });

  it('never overwrites the first daily attempt', () => {
    const mode = { kind: 'daily', date: '2026-09-01' } as const;
    saveResult(mode, result);
    const perfect = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: true,
        points: 1_000,
      })),
      correctCount: 2,
      score: 4_000,
    };

    expect(saveResult(mode, perfect)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
    expect(readDailyResult(mode.date)).toEqual(result);
  });

  it('only credits new results completed on their UTC challenge date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-03T12:00:00.000Z'));
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {},
        streak: { creditedDates: [], version: 1 },
        training: {},
      }),
    );

    saveResult({ kind: 'daily', date: '2026-09-01' }, result);
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
    saveResult({ kind: 'daily', date: '2026-09-03' }, zeroScore);
    expect(readDailyStreak('2026-09-03')).toBe(1);
  });

  it("keeps yesterday's streak active and crosses a year boundary", () => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {
          '2025-12-31': result,
          '2026-01-01': result,
        },
        streak: {
          creditedDates: ['2025-12-31', '2026-01-01'],
          version: 1,
        },
        training: {},
      }),
    );

    expect(readDailyStreak('2026-01-02')).toBe(2);
    expect(readDailyStreak('2026-01-03')).toBe(0);
  });

  it('keeps a separate Training best for each knowledge configuration', () => {
    const mode = { kind: 'training' } as const;
    saveResult(mode, result, defaultModifiers);
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

    expect(saveResult(mode, lower, defaultModifiers)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
    expect(
      saveResult(mode, lower, {
        ...defaultModifiers,
        generations: ['I'],
      }),
    ).toEqual({
      best: lower,
      isNewBest: true,
      isSaved: true,
    });
    const longer = {
      ...result,
      answers: [
        ...result.answers,
        {
          category: 'type' as const,
          cluesUsed: 0,
          correct: true,
          generation: 'III' as const,
          points: 1_000,
          questionType: 'type-check' as const,
        },
      ],
      correctCount: 2,
      questionCount: 3,
    };
    expect(saveResult(mode, longer, defaultModifiers).isNewBest).toBe(true);
  });

  it('normalizes Training record keys independently of selection order', () => {
    const reordered = {
      ...defaultModifiers,
      generations: [...defaultModifiers.generations].reverse(),
      questionTypes: [...defaultModifiers.questionTypes].reverse(),
    };

    expect(getTrainingRecordKey(reordered, 10)).toBe(
      getTrainingRecordKey(defaultModifiers, 10),
    );
  });

  it('builds Trainer Card totals from completed games', () => {
    const perfect = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: true,
        points: 1_000,
      })),
      correctCount: result.questionCount,
    };

    saveResult({ kind: 'training' }, perfect, defaultModifiers);

    expect(readTrainerStats()).toMatchObject({
      categories: {
        identity: { correct: 1, total: 1 },
        stat: { correct: 1, total: 1 },
      },
      gamesCompleted: 1,
      masteryRounds: 0,
      perfectRounds: 1,
    });
  });

  it('tracks League mastery without rewarding perfect Quick rounds', () => {
    const perfectAnswers = Array.from({ length: 10 }, (_, index) => ({
      category: index === 9 ? ('champion' as const) : ('identity' as const),
      cluesUsed: 0,
      correct: true,
      generation: index % 2 === 0 ? ('I' as const) : ('II' as const),
      points: 1_000,
      questionType:
        index === 9 ? ('champion' as const) : ('pokedex-scan' as const),
    }));
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

    saveResult({ kind: 'training' }, quick, {
      ...defaultModifiers,
      limit: 5,
    });
    expect(readTrainerStats().masteryRounds).toBe(0);

    saveResult({ kind: 'training' }, standard, defaultModifiers);
    expect(readTrainerStats()).toMatchObject({
      championAnswersWithoutClues: 1,
      correctGenerations: { I: 8, II: 7 },
      correctQuestionTypes: { 'pokedex-scan': 14 },
      masteryRounds: 1,
    });
  });

  it('unlocks a specialty only after enough field research', () => {
    const identityResult = {
      ...result,
      answers: Array.from({ length: 10 }, () => ({
        category: 'identity' as const,
        cluesUsed: 0,
        correct: true,
        generation: 'I' as const,
        points: 1_000,
        questionType: 'pokedex-scan' as const,
      })),
      correctCount: 10,
      questionCount: 10,
    };

    saveResult({ kind: 'training' }, identityResult, defaultModifiers);

    expect(readTrainerStats().specialty).toEqual({
      category: 'identity',
      correct: 10,
      total: 10,
    });
  });

  it('reports when browser storage cannot persist a result', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage disabled', 'QuotaExceededError');
      });

    expect(canPersistResults()).toBe(false);
    expect(saveResult({ kind: 'daily', date: '2026-09-01' }, result)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: false,
    });
    setItem.mockRestore();
  });
});

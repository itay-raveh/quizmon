import {
  canPersistResults,
  getLeagueChallengeSeed,
  getHighScoreKey,
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
      pokemonName: 'pikachu',
      points: 1_000,
      questionType: 'pokedex-scan',
    },
    {
      category: 'stat',
      cluesUsed: 0,
      correct: false,
      generation: 'II',
      pokemonName: 'sudowoodo',
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

  it('keeps one Daily best across challenge dates', () => {
    saveResult({ kind: 'daily', date: '2026-09-01' }, result);
    const lower = { ...result, score: 500 };

    expect(saveResult({ kind: 'daily', date: '2026-09-02' }, lower)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
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

  it('keeps one League Training best across knowledge configurations', () => {
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
      best: result,
      isNewBest: false,
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
          pokemonName: 'rayquaza',
          points: 1_000,
          questionType: 'type-check' as const,
        },
      ],
      correctCount: 2,
      questionCount: 3,
    };
    expect(saveResult(mode, longer, defaultModifiers).isNewBest).toBe(false);
  });

  it('uses only Daily, League, and Custom high-score keys', () => {
    expect(
      getHighScoreKey({ kind: 'daily', date: '2026-09-05' }, defaultModifiers),
    ).toBe('daily');
    expect(getHighScoreKey({ kind: 'training' }, defaultModifiers)).toBe(
      'league',
    );
    expect(
      getHighScoreKey(
        { kind: 'training' },
        { ...defaultModifiers, trainingMode: 'custom' },
      ),
    ).toBe('custom');
    expect(getHighScoreKey({ kind: 'league' }, defaultModifiers)).toBeNull();
  });

  it('keeps League and Custom Training bests separate', () => {
    saveResult({ kind: 'training' }, result, defaultModifiers);
    const customResult = { ...result, score: 500 };

    expect(
      saveResult({ kind: 'training' }, customResult, {
        ...defaultModifiers,
        trainingMode: 'custom',
      }),
    ).toEqual({
      best: customResult,
      isNewBest: true,
      isSaved: true,
    });
  });

  it('builds Trainer progression from correct answers', () => {
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
      correctCategories: {
        identity: 1,
        stat: 1,
      },
      correctPokemon: ['pikachu', 'sudowoodo'],
      masteryRounds: 0,
      quickAttackCompleted: false,
    });
  });

  it('tracks League mastery without rewarding perfect Quick rounds', () => {
    const perfectAnswers = Array.from({ length: 10 }, (_, index) => ({
      category: index === 9 ? ('champion' as const) : ('identity' as const),
      cluesUsed: 0,
      correct: true,
      generation: index % 2 === 0 ? ('I' as const) : ('II' as const),
      pokemonName: `pokemon-${index}`,
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

    saveResult({ kind: 'training' }, quick, defaultModifiers);
    expect(readTrainerStats().masteryRounds).toBe(0);

    saveResult({ kind: 'training' }, standard, defaultModifiers);
    expect(readTrainerStats()).toMatchObject({
      championAnswersWithoutClues: 1,
      correctGenerations: { I: 8, II: 7 },
      correctPokemon: perfectAnswers.map(({ pokemonName }) => pokemonName),
      correctQuestionTypes: { 'pokedex-scan': 14 },
      masteryRounds: 1,
      quickAttackCompleted: true,
    });
  });

  it('keeps knowledge progress but pauses performance badges under custom rules', () => {
    const answers = Array.from({ length: 10 }, (_, index) => ({
      category: 'identity' as const,
      cluesUsed: 0,
      correct: true,
      generation: 'I' as const,
      pokemonName: `pokemon-${index}`,
      points: 1_000,
      questionType: 'pokedex-scan' as const,
    }));
    const perfect = {
      ...result,
      answers,
      correctCount: 10,
      elapsedSeconds: 30,
      questionCount: 10,
    };

    saveResult({ kind: 'training' }, perfect, {
      ...defaultModifiers,
      questionTypes: ['pokedex-scan'],
      trainingMode: 'custom',
    });

    expect(readTrainerStats()).toMatchObject({
      correctPokemon: answers.map(({ pokemonName }) => pokemonName),
      masteryRounds: 0,
      quickAttackCompleted: false,
    });
  });

  it('requires both speed and accuracy for Quick Attack', () => {
    const answers = Array.from({ length: 10 }, (_, index) => ({
      category: 'identity' as const,
      cluesUsed: 0,
      correct: index < 8,
      generation: 'I' as const,
      pokemonName: `pokemon-${index}`,
      points: index < 8 ? 1_000 : 0,
      questionType: 'pokedex-scan' as const,
    }));
    const standard = {
      ...result,
      answers,
      correctCount: 8,
      elapsedSeconds: 59,
      questionCount: 10,
    };

    saveResult(
      { kind: 'training' },
      { ...standard, elapsedSeconds: 60 },
      defaultModifiers,
    );
    expect(readTrainerStats().quickAttackCompleted).toBe(false);

    saveResult(
      { kind: 'training' },
      {
        ...standard,
        answers: answers.map((answer, index) => ({
          ...answer,
          correct: index < 7,
          points: index < 7 ? 1_000 : 0,
        })),
        correctCount: 7,
      },
      defaultModifiers,
    );
    expect(readTrainerStats().quickAttackCompleted).toBe(false);

    saveResult({ kind: 'training' }, standard, defaultModifiers);

    expect(readTrainerStats().quickAttackCompleted).toBe(true);
  });

  it('keeps one League lineup until a perfect challenge clears it', () => {
    const seed = getLeagueChallengeSeed();
    const answers = Array.from({ length: 15 }, (_, index) => ({
      category: 'identity' as const,
      cluesUsed: 0,
      correct: true,
      generation: 'I' as const,
      pokemonName: `league-${index}`,
      points: 1_000,
      questionType: 'pokedex-scan' as const,
    }));
    const leagueResult = {
      ...result,
      answers,
      correctCount: 15,
      questionCount: 15,
    };

    saveResult(
      { kind: 'league' },
      {
        ...leagueResult,
        answers: [answers[0]!, { ...answers[1]!, correct: false, points: 0 }],
        correctCount: 1,
      },
      defaultModifiers,
    );
    expect(getLeagueChallengeSeed()).toBe(seed);
    expect(readTrainerStats().leagueCompleted).toBe(false);

    saveResult(
      { kind: 'league' },
      {
        ...leagueResult,
        answers: answers.slice(0, 14),
        correctCount: 14,
        questionCount: 14,
      },
      defaultModifiers,
    );
    expect(readTrainerStats().leagueCompleted).toBe(false);

    saveResult({ kind: 'league' }, leagueResult, defaultModifiers);
    expect(readTrainerStats().leagueCompleted).toBe(true);
    expect(getLeagueChallengeSeed()).not.toBe(seed);
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

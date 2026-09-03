import {
  canPersistResults,
  getTrainingRecordKey,
  readDailyResult,
  readDailyStreak,
  readTrainerProfile,
  readTrainerStats,
  saveTrainerProfile,
  saveResult,
} from '@/game/storage';
import { defaultModifiers } from '@/game/game';
import type { GameResult } from '@/game/types';

const result: GameResult = {
  answers: [
    { category: 'identity', correct: true, points: 1_000 },
    { category: 'stat', correct: false, points: 0 },
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

  it('credits a consecutive legacy daily history once', () => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {
          '2026-08-31': result,
          '2026-09-01': result,
          '2026-09-02': result,
        },
        training: {},
      }),
    );

    expect(readDailyStreak('2026-09-03')).toBe(3);
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
        { category: 'type' as const, correct: true, points: 1_000 },
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

  it('builds Trainer Card totals and migrates existing records', () => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {
          '2026-08-31': result,
          '2026-09-01': result,
          '2026-09-02': result,
        },
        streak: {
          creditedDates: ['2026-08-31', '2026-09-01', '2026-09-02'],
          version: 1,
        },
        training: {
          legacy: {
            ...result,
            answers: result.answers.map((answer) => ({
              ...answer,
              correct: true,
            })),
            correctCount: result.questionCount,
          },
        },
      }),
    );

    expect(readTrainerStats()).toEqual({
      bestDailyStreak: 3,
      categories: {
        identity: { correct: 4, total: 4 },
        stat: { correct: 1, total: 4 },
      },
      dailyChallengesCompleted: 3,
      gamesCompleted: 4,
      perfectRounds: 1,
      specialty: null,
    });

    saveResult({ kind: 'training' }, result, defaultModifiers);
    expect(readTrainerStats()).toMatchObject({
      gamesCompleted: 5,
      perfectRounds: 1,
    });
  });

  it('unlocks a specialty only after enough field research', () => {
    const identityResult = {
      ...result,
      answers: Array.from({ length: 10 }, () => ({
        category: 'identity' as const,
        correct: true,
        points: 1_000,
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

  it('creates and saves a versioned local Trainer profile', () => {
    const profile = readTrainerProfile();

    expect(profile.cardNumber).toMatch(/^QZ-\d{6}$/);
    expect(profile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(profile).toMatchObject({
      accent: 'cobalt',
      hasBeenRevealed: false,
      name: '',
      partnerPokemon: null,
      version: 1,
    });

    const saved = saveTrainerProfile({
      ...profile,
      hasBeenRevealed: true,
      name: '  Leaf  ',
      partnerPokemon: 'bulbasaur',
    });

    expect(saved).toMatchObject({
      hasBeenRevealed: true,
      name: 'Leaf',
      partnerPokemon: 'bulbasaur',
    });
    expect(readTrainerProfile()).toEqual(saved);
  });

  it('recalculates scores saved under the previous formula', () => {
    const legacyResult = { ...result, scoreVersion: undefined };
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {
          '2026-09-01': {
            ...legacyResult,
            answers: [
              {
                category: 'identity',
                correct: true,
                points: 100,
                responseMilliseconds: 5_000,
                speedBonus: 16,
              },
              { category: 'stat', correct: false, points: 0 },
            ],
            score: 100,
          },
        },
        training: {},
      }),
    );

    expect(readDailyResult('2026-09-01')).toMatchObject({
      answers: [
        { points: 1_000, speedBonus: 1_500 },
        { points: 0, speedBonus: 0 },
      ],
      score: 3_000,
      scoreVersion: 2,
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

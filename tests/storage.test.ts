import {
  canPersistResults,
  readDailyResult,
  readDailyStreak,
  saveResult,
} from '@/game/storage';
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

  it('keeps the best Training score for each quiz length', () => {
    const mode = { kind: 'training' } as const;
    saveResult(mode, result);
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

    expect(saveResult(mode, lower)).toEqual({
      best: result,
      isNewBest: false,
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
    expect(saveResult(mode, longer).isNewBest).toBe(true);
  });

  it('recovers a Training best saved under an obsolete settings key', () => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {},
        training: {
          '{"generations":["I"],"oldSetting":true}': result,
        },
      }),
    );
    const lower = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: false,
        points: 0,
      })),
      correctCount: 0,
    };

    expect(saveResult({ kind: 'training' }, lower)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
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

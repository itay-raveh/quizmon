import { defaultModifiers } from '@/game/game';
import { canPersistResults, readDailyResult, saveResult } from '@/game/storage';
import type { GameResult } from '@/game/types';

const result: GameResult = {
  answers: [
    { category: 'identity', correct: true, points: 100 },
    { category: 'stat', correct: false, points: 0 },
  ],
  contentVersion: 2,
  correctCount: 1,
  elapsedSeconds: 20,
  questionCount: 2,
  score: 150,
};

describe('saved results', () => {
  beforeEach(() => window.localStorage.clear());

  it('records a daily result once and restores it', () => {
    const mode = { kind: 'daily', date: '2026-09-01' } as const;
    expect(saveResult(mode, defaultModifiers, result)).toEqual({
      best: result,
      isNewBest: true,
      isSaved: true,
    });
    expect(readDailyResult(mode.date)).toEqual(result);
  });

  it('never overwrites the first daily attempt', () => {
    const mode = { kind: 'daily', date: '2026-09-01' } as const;
    saveResult(mode, defaultModifiers, result);
    const perfect = {
      ...result,
      answers: result.answers.map((answer) => ({
        ...answer,
        correct: true,
        points: 100,
      })),
      correctCount: 2,
      score: 400,
    };

    expect(saveResult(mode, defaultModifiers, perfect)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
    expect(readDailyResult(mode.date)).toEqual(result);
  });

  it('keeps the best Training score for each setup', () => {
    const mode = { kind: 'training' } as const;
    saveResult(mode, defaultModifiers, result);
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

    expect(saveResult(mode, defaultModifiers, lower)).toEqual({
      best: result,
      isNewBest: false,
      isSaved: true,
    });
    expect(
      saveResult(
        mode,
        { ...defaultModifiers, questionTypes: ['stat-showdown'] },
        lower,
      ).isNewBest,
    ).toBe(true);
  });

  it('recalculates scores saved under the previous formula', () => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {
          '2026-09-01': { ...result, score: 100 },
        },
        training: {},
      }),
    );

    expect(readDailyResult('2026-09-01')?.score).toBe(150);
  });

  it('reports when browser storage cannot persist a result', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage disabled', 'QuotaExceededError');
      });

    expect(canPersistResults()).toBe(false);
    expect(
      saveResult(
        { kind: 'daily', date: '2026-09-01' },
        defaultModifiers,
        result,
      ),
    ).toEqual({ best: result, isNewBest: false, isSaved: false });
    setItem.mockRestore();
  });
});

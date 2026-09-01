import { defaultModifiers } from '@/game/game';
import { saveBestScore } from '@/game/storage';
import type { GameResult } from '@/game/types';

const mode = { kind: 'daily', date: '2026-09-01' } as const;
const result: GameResult = {
  correctCount: 8,
  elapsedSeconds: 20,
  questionCount: 10,
  score: 2560,
};

describe('best scores', () => {
  beforeEach(() => window.localStorage.clear());

  it('records the first result as a new best', () => {
    expect(saveBestScore(mode, defaultModifiers, result)).toEqual({
      best: result,
      isNewBest: true,
    });
  });

  it('keeps a higher previous score for the same mode', () => {
    saveBestScore(mode, defaultModifiers, result);
    const lower = { ...result, correctCount: 6, score: 1000 };

    expect(saveBestScore(mode, defaultModifiers, lower)).toEqual({
      best: result,
      isNewBest: false,
    });
  });

  it('keeps daily dates and custom modifier sets separate', () => {
    saveBestScore(mode, defaultModifiers, result);

    expect(
      saveBestScore(
        { kind: 'daily', date: '2026-09-02' },
        defaultModifiers,
        result,
      ).isNewBest,
    ).toBe(true);
    expect(
      saveBestScore({ kind: 'custom' }, defaultModifiers, result).isNewBest,
    ).toBe(true);
    expect(
      saveBestScore(
        { kind: 'custom' },
        { ...defaultModifiers, whosThatPokemon: true },
        result,
      ).isNewBest,
    ).toBe(true);
  });
});

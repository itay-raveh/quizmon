import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameResult } from '@/domain/quiz/types';
import {
  markStayedAtLevel,
  recordCompletedTrainingRound,
  suggestedLevel,
} from './level-advancement';

const result = (level: 1 | 2 | 3 | 4 | 5, correctCount = 10) =>
  ({
    correctCount,
    questionCount: 10,
    rules: { level: level },
  }) as GameResult;

describe('level advancement suggestion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('suggests the next level after a perfect Training round', () => {
    expect(suggestedLevel(result(1), 1)).toBe(2);
    expect(suggestedLevel(result(4), 4)).toBe(5);
  });

  it('does not suggest after a miss, at Level 5, or when settings changed', () => {
    expect(suggestedLevel(result(1, 9), 1)).toBeNull();
    expect(suggestedLevel(result(5), 5)).toBeNull();
    expect(suggestedLevel(result(2), 3)).toBeNull();
  });

  it('waits one, two, then four completed rounds after explicit stays', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });

    let round = 0;
    for (const wait of [1, 2, 4, 4]) {
      const offerSeed = `offer-${round}`;
      markStayedAtLevel(1, offerSeed);
      markStayedAtLevel(1, offerSeed);
      expect(suggestedLevel(result(1), 1)).toBeNull();
      expect(suggestedLevel(result(2), 2)).toBe(3);

      for (let skipped = 0; skipped < wait; skipped++) {
        const seed = `round-${round++}`;
        recordCompletedTrainingRound(1, seed);
        recordCompletedTrainingRound(1, seed);
        expect(suggestedLevel(result(1), 1)).toBeNull();
      }

      recordCompletedTrainingRound(1, `round-${round++}`);
      expect(suggestedLevel(result(1), 1)).toBe(2);
    }
  });

  it('counts imperfect Training rounds toward the wait', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });

    markStayedAtLevel(1, 'offer');
    recordCompletedTrainingRound(1, 'imperfect');
    expect(suggestedLevel(result(1, 9), 1)).toBeNull();
    recordCompletedTrainingRound(1, 'next-perfect');
    expect(suggestedLevel(result(1), 1)).toBe(2);
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { GameResult } from '@/domain/quiz/types';
import {
  markLevelAdvancementOffered,
  suggestedLevel,
  wasLevelAdvancementOffered,
} from './level-advancement';

const result = (level: 1 | 2 | 3 | 4 | 5, correctCount = 10) =>
  ({
    correctCount,
    questionCount: 10,
    rules: { difficulty: level },
  }) as GameResult;

describe('level advancement suggestion', () => {
  it('suggests the next level after a saved perfect Training round', () => {
    expect(suggestedLevel(result(1), 1, true)).toBe(2);
    expect(suggestedLevel(result(4), 4, true)).toBe(5);
  });

  it('does not suggest after a miss, at Level 5, or when settings changed', () => {
    expect(suggestedLevel(result(1, 9), 1, true)).toBeNull();
    expect(suggestedLevel(result(5), 5, true)).toBeNull();
    expect(suggestedLevel(result(2), 3, true)).toBeNull();
    expect(suggestedLevel(result(2), 2, false)).toBeNull();
  });

  it('remembers an offer separately for each level', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    try {
      expect(wasLevelAdvancementOffered(1)).toBe(false);
      markLevelAdvancementOffered(1);
      expect(wasLevelAdvancementOffered(1)).toBe(true);
      expect(wasLevelAdvancementOffered(2)).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

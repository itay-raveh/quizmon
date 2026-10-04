import {
  getQuestionScore,
  getQuestionScoreFactor,
  getResponseTime,
  getScoreBreakdown,
} from './scoring';
import { getQuestionTypeMultiplier } from './training-scoring';
import { formatScoreMultiplier } from './format';
import { questionTypes } from './questions/definitions';

describe('scoring', () => {
  it('reduces a Champion answer when clues are used', () => {
    const answer = {
      questionType: 'champion' as const,
      correct: true,
      responseMilliseconds: 5000,
    };
    const full = getQuestionScore({ ...answer, cluesUsed: 0 }, 3);
    const helped = getQuestionScore({ ...answer, cluesUsed: 2 }, 3);

    expect(helped.score).toBeLessThan(full.score);
    expect(helped.answers).toBeLessThan(full.answers);
    expect(helped.speed).toBeLessThan(full.speed);
    expect(getQuestionScore({ ...answer, correct: false }, 3).score).toBe(0);
    for (const level of [1, 2, 3, 4, 5] as const)
      for (const cluesUsed of [0, 1, 2, 3])
        expect(
          Number.isInteger(
            getQuestionScoreFactor('champion', level, cluesUsed),
          ),
        ).toBe(true);
  });

  it('distinguishes long-running families, new formats, and new families with integer factors', () => {
    for (const type of questionTypes)
      for (const level of [1, 2, 3, 4, 5] as const) {
        const factor = getQuestionTypeMultiplier(type, level);
        if (factor !== undefined) expect(Number.isInteger(factor)).toBe(true);
      }
    expect(getQuestionTypeMultiplier('spriteForPokemon', 5)).toBe(5);
    expect(getQuestionTypeMultiplier('pokemonFromSilhouette', 5)).toBe(7);
    expect(getQuestionTypeMultiplier('hiddenAbilities', 5)).toBe(9);
    expect(
      formatScoreMultiplier(getQuestionTypeMultiplier('hiddenAbilities', 5)!),
    ).toBe('×9');
  });

  it('rewards a deliberate level increase only when accuracy holds up', () => {
    const answers = (
      correct: number,
      questionType: 'evYields' | 'evolutionChain' = 'evYields',
    ) =>
      Array.from({ length: 10 }, (_, index) => ({
        questionType,
        correct: index < correct,
        responseMilliseconds: 5000,
      }));
    const score = (
      correct: number,
      level: 4 | 5,
      type?: 'evYields' | 'evolutionChain',
    ) => getScoreBreakdown(answers(correct, type), level).score;

    expect(score(5, 5)).toBeLessThan(score(9, 4));
    expect(score(9, 5)).toBeGreaterThan(score(10, 4));
    expect(score(9, 5, 'evolutionChain')).toBeLessThan(score(10, 4));
    expect(Math.abs(score(5, 5) - score(10, 5) / 2)).toBeLessThanOrEqual(0.5);
    expect(
      getScoreBreakdown(
        answers(10).map((answer) => ({ ...answer, responseMilliseconds: 0 })),
        5,
      ).score,
    ).toBe(105_000);
  });

  it('totals only active answer time', () => {
    expect(
      getResponseTime([
        { responseMilliseconds: 1_900 },
        { responseMilliseconds: 2_600 },
        {},
      ]),
    ).toEqual({ elapsedMilliseconds: 4_500, elapsedSeconds: 4 });
  });
});

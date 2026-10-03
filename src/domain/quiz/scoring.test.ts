import {
  getQuestionScore,
  getResponseTime,
  getScoreBreakdown,
} from './scoring';

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
    expect(score(7, 5)).toBeGreaterThan(score(10, 4));
    expect(score(7, 5, 'evolutionChain')).toBeLessThan(score(10, 4));
    expect(score(5, 5)).toBe(Math.round(score(10, 5) / 2));
    expect(
      getScoreBreakdown(
        answers(10).map((answer) => ({ ...answer, responseMilliseconds: 0 })),
        5,
      ).score,
    ).toBe(98_304);
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

import {
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getScoreBreakdown,
  getSpeedBonusPoints,
  getTrainingScoreBreakdown,
} from './scoring';

describe('scoring', () => {
  it('reduces Champion awards for help without dropping below the final clue', () => {
    expect(getAnswerPoints({ category: 'champion' }, true, 0)).toBeGreaterThan(
      getAnswerPoints({ category: 'champion' }, true, 1),
    );
    expect(getAnswerPoints({ category: 'champion' }, true, 8)).toBe(
      getAnswerPoints({ category: 'champion' }, true, 3),
    );
    expect(getAnswerPoints({ category: 'champion' }, false)).toBe(0);
  });

  it('adds a bounded mastery bonus to earned knowledge points', () => {
    const answers = [
      {
        category: 'identity',
        correct: true,
        points: 1_000,
      },
      {
        category: 'stat',
        correct: false,
        points: 0,
      },
      {
        category: 'champion',
        cluesUsed: 2,
        correct: true,
        points: 500,
      },
    ] as const;

    expect(getScoreBreakdown(answers)).toEqual({
      knowledge: 1_500,
      speed: 0,
      mastery: 750,
    });
    expect(calculateScore(answers)).toBe(2_250);
  });

  it.each([
    [1_000, 0, 3_000],
    [1_000, 2_000, 2_270],
    [1_000, 5_000, 1_500],
    [1_000, 8_000, 990],
    [1_000, 16_000, 330],
    [1_000, -1, 3_000],
    [0, 0, 0],
  ])(
    'gives %i knowledge points after %i ms a %i speed bonus',
    (points, elapsed, bonus) => {
      expect(getSpeedBonusPoints(points, elapsed)).toBe(bonus);
    },
  );

  it('combines knowledge, speed, and mastery for a perfect round', () => {
    const perfect = Array.from({ length: 10 }, () => ({
      category: 'identity' as const,
      correct: true,
      points: 1_000,
      speedBonus: 3_000,
    }));

    expect(getScoreBreakdown(perfect)).toEqual({
      knowledge: 10_000,
      speed: 30_000,
      mastery: 10_000,
    });
    expect(calculateScore(perfect)).toBe(50_000);
    expect(getScoreBreakdown([])).toEqual({
      knowledge: 0,
      speed: 0,
      mastery: 0,
    });
  });

  it('rewards a deliberate level increase only when accuracy holds up', () => {
    const answers = (
      correct: number,
      questionType: 'evYields' | 'evolutionChain' = 'evYields',
    ) =>
      Array.from({ length: 10 }, (_, index) => ({
        category: 'identity' as const,
        questionType,
        correct: index < correct,
        points: index < correct ? 1000 : 0,
        responseMilliseconds: 5000,
      }));
    const score = (
      correct: number,
      level: 4 | 5,
      type?: 'evYields' | 'evolutionChain',
    ) => getTrainingScoreBreakdown(answers(correct, type), level).score;

    expect(score(5, 5)).toBeLessThan(score(9, 4));
    expect(score(7, 5)).toBeGreaterThan(score(10, 4));
    expect(score(7, 5, 'evolutionChain')).toBeLessThan(score(10, 4));
    expect(score(5, 5)).toBe(Math.round(score(10, 5) / 2));
    expect(
      getTrainingScoreBreakdown(
        answers(10).map((answer) => ({ ...answer, responseMilliseconds: 0 })),
        5,
      ).score,
    ).toBe(98_304);
  });

  it('scores a saved answer even if its family is no longer offered at that level', () => {
    const oldAnswer = {
      category: 'type' as const,
      questionType: 'pokemonTypes' as const,
      correct: true,
      points: 1000,
      responseMilliseconds: 5000,
    };
    const score = getTrainingScoreBreakdown([oldAnswer], 5).score;
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(
      getTrainingScoreBreakdown([{ ...oldAnswer, questionType: 'evYields' }], 5)
        .score,
    );
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

import {
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getScoreBreakdown,
  getSpeedBonusPoints,
} from './scoring';

describe('scoring', () => {
  it('awards 1,000 points for a normal correct answer', () => {
    const question = { category: 'stat' } as const;
    expect(getAnswerPoints(question, true)).toBe(1_000);
    expect(getAnswerPoints(question, false)).toBe(0);
  });

  it.each([
    [0, 1_000],
    [1, 750],
    [2, 500],
    [3, 250],
    [8, 250],
  ])('awards %i-assist Champion answers %i points', (assists, points) => {
    expect(getAnswerPoints({ category: 'champion' }, true, assists)).toBe(
      points,
    );
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
    expect(calculateScore([])).toBe(0);
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

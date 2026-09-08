import {
  calculateScore,
  getAnswerPoints,
  getScoreBreakdown,
  getSpeedBonusPoints,
  getResponseTime,
} from '@/game/scoring';

describe('scoring', () => {
  it('awards 1,000 points for a normal correct answer', () => {
    const question = { category: 'stat' } as const;
    expect(getAnswerPoints(question, true)).toBe(1_000);
    expect(getAnswerPoints(question, false)).toBe(0);
  });

  it('reduces Champion points as answer assistance is revealed', () => {
    const question = { category: 'champion' } as const;

    expect(getAnswerPoints(question, true, 0)).toBe(1_000);
    expect(getAnswerPoints(question, true, 1)).toBe(750);
    expect(getAnswerPoints(question, true, 2)).toBe(500);
    expect(getAnswerPoints(question, true, 3)).toBe(250);
    expect(getAnswerPoints(question, true, 8)).toBe(250);
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

  it('rewards quick answers with a volatile five-second half-life', () => {
    expect(getSpeedBonusPoints(1_000, 0)).toBe(3_000);
    expect(getSpeedBonusPoints(1_000, 2_000)).toBe(2_270);
    expect(getSpeedBonusPoints(1_000, 5_000)).toBe(1_500);
    expect(getSpeedBonusPoints(1_000, 8_000)).toBe(990);
    expect(getSpeedBonusPoints(1_000, 16_000)).toBe(330);
    expect(getSpeedBonusPoints(1_000, -1)).toBe(3_000);
    expect(getSpeedBonusPoints(0, 0)).toBe(0);
  });

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

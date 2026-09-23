import {
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getScoreBreakdown,
  getSpeedBonusPoints,
} from './scoring';
import type { ScoreMultipliers } from './types';

describe('scoring', () => {
  it('multiplies the whole base score and rounds only the final total', () => {
    const answers = [
      {
        category: 'identity' as const,
        correct: true,
        points: 1000,
        speedBonus: 250,
      },
    ];
    const multipliers: ScoreMultipliers = {
      difficulty: 4,
      generations: 3,
      questionTypes: [
        { questionType: 'sprite-match', multiplier: 0.75 },
        { questionType: 'type-check', multiplier: 1 },
        { questionType: 'ev-yields', multiplier: 1.25 },
      ],
    };
    expect(calculateScore(answers, multipliers)).toBe(25313);
    expect(calculateScore(answers)).toBe(2250);
    expect(calculateScore([], multipliers)).toBe(0);
    expect(
      calculateScore(answers, {
        ...multipliers,
        questionTypes: [...multipliers.questionTypes].reverse(),
      }),
    ).toBe(25313);
  });
  it('awards 1,000 points for a normal correct answer', () => {
    const question = { category: 'stat' } as const;
    expect(getAnswerPoints(question, true)).toBe(1_000);
    expect(getAnswerPoints(question, false)).toBe(0);
  });

  it('weights earned points and mastery by each drawn question type', () => {
    const answers = [
      {
        category: 'identity' as const,
        questionType: 'sprite-match' as const,
        correct: true,
        points: 1_000,
        speedBonus: 2_000,
      },
      {
        category: 'identity' as const,
        questionType: 'ev-yields' as const,
        correct: true,
        points: 1_000,
        speedBonus: 0,
      },
    ];
    const multipliers: ScoreMultipliers = {
      difficulty: 2,
      generations: 1,
      perQuestion: true,
      questionTypes: [
        { questionType: 'sprite-match', multiplier: 0.75 },
        { questionType: 'ev-yields', multiplier: 1.25 },
      ],
    };
    expect(getScoreBreakdown(answers)).toEqual({
      knowledge: 2_000,
      speed: 2_000,
      mastery: 2_000,
    });
    expect(calculateScore(answers, multipliers)).toBe(11_000);
    expect(
      calculateScore(answers, { ...multipliers, perQuestion: undefined }),
    ).toBe(11_250);
    expect(
      calculateScore(answers, {
        ...multipliers,
        perQuestion: undefined,
        questionMix: 1,
      }),
    ).toBe(12_000);
    expect(
      calculateScore(
        [answers[0]!, { ...answers[1]!, correct: false, points: 0 }],
        multipliers,
      ),
    ).toBe(5_250);
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

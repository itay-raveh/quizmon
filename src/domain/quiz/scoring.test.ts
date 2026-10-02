import {
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getScoreBreakdown,
  getSpeedBonusPoints,
} from './scoring';
import type { ScoreMultipliers } from './types';
import type { TrainingScoreMultipliers } from './score-multipliers';

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
      level: 4,
      generations: 3,
      questionTypes: [
        { questionType: 'spriteForPokemon', multiplier: 0.75 },
        { questionType: 'pokemonTypes', multiplier: 1 },
        { questionType: 'evYields', multiplier: 1.25 },
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
  it('compounds drawn question factors and retains the earlier award rule', () => {
    const answers = [
      {
        category: 'identity' as const,
        questionType: 'spriteForPokemon' as const,
        correct: true,
        points: 1_000,
        speedBonus: 2_000,
      },
      {
        category: 'identity' as const,
        questionType: 'evYields' as const,
        correct: true,
        points: 1_000,
        speedBonus: 0,
      },
    ];
    const multipliers: ScoreMultipliers = {
      level: 2,
      generations: 1,
      perQuestion: true,
      questionTypes: [
        { questionType: 'spriteForPokemon', multiplier: 0.75 },
        { questionType: 'evYields', multiplier: 1.25 },
      ],
    };
    expect(getScoreBreakdown(answers)).toEqual({
      knowledge: 2_000,
      speed: 2_000,
      mastery: 2_000,
    });
    expect(calculateScore(answers, multipliers)).toBe(11_250);
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
    ).toBe(6_563);
  });

  it('applies every drawn factor even when only one of ten answers earns points', () => {
    const answers = Array.from({ length: 10 }, (_, index) => ({
      category: 'identity' as const,
      questionType: 'evYields' as const,
      correct: index === 0,
      points: index === 0 ? 1_000 : 0,
    }));
    const multipliers: ScoreMultipliers = {
      level: 1,
      generations: 1,
      perQuestion: true,
      questionTypes: [{ questionType: 'evYields', multiplier: 1.25 }],
    };
    expect(calculateScore(answers, multipliers)).toBe(10_245);
  });

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
    const answers = (correct: number) =>
      Array.from({ length: 10 }, (_, index) => ({
        category: 'identity' as const,
        questionType: 'pokemonTypes' as const,
        correct: index < correct,
        points: index < correct ? 1000 : 0,
        responseMilliseconds: 5000,
      }));
    const factors = (
      level: 4 | 5,
      ruleLevel: 4 | 5,
    ): TrainingScoreMultipliers => ({
      version: 2,
      level,
      questionTypes: [{ questionType: 'pokemonTypes', ruleLevel }],
    });
    const level4 = factors(4, 4);
    const level5 = factors(5, 5);
    const carried = factors(5, 4);
    expect(calculateScore(answers(5), level5)).toBeLessThan(
      calculateScore(answers(9), level4),
    );
    expect(calculateScore(answers(7), level5)).toBeGreaterThan(
      calculateScore(answers(10), level4),
    );
    expect(calculateScore(answers(7), carried)).toBeLessThan(
      calculateScore(answers(10), level4),
    );
    expect(
      calculateScore(
        [
          { ...answers(1)[0]!, questionType: 'pokemonTypes' },
          {
            ...answers(0)[0]!,
            questionType: 'evYields',
            responseMilliseconds: 0,
          },
        ],
        {
          ...level5,
          questionTypes: [
            ...level5.questionTypes,
            { questionType: 'evYields', ruleLevel: 4 },
          ],
        },
      ),
    ).toBe(calculateScore(answers(1).slice(0, 1), level5));
    expect(calculateScore(answers(5), level5)).toBe(
      Math.round(calculateScore(answers(10), level5) / 2),
    );
    expect(
      calculateScore(
        answers(10).map((answer) => ({
          ...answer,
          responseMilliseconds: 0,
        })),
        level5,
      ),
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

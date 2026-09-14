import {
  getQuestionTypeMultiplier,
  getTrainingScoreMultipliers,
  getScoreMultiplier,
  isScoreMultipliers,
} from './score-multipliers';
import type { ScoreMultipliers } from './types';

const multipliers: ScoreMultipliers = {
  difficulty: 5,
  generations: 9,
  questionTypes: [{ questionType: 'ev-yields', multiplier: 1.25 }],
};

it('adds hard types and penalizes easy types in the combined multiplier', () => {
  expect(getScoreMultiplier(multipliers)).toBe(56.25);
  expect(
    getScoreMultiplier({
      ...multipliers,
      questionTypes: [
        ...multipliers.questionTypes,
        { questionType: 'sprite-match', multiplier: 0.75 },
      ],
    }),
  ).toBe(42.1875);
  expect(
    getScoreMultiplier({
      ...multipliers,
      questionTypes: [
        ...multipliers.questionTypes,
        { questionType: 'hidden-abilities', multiplier: 1.25 },
      ],
    }),
  ).toBe(70.3125);
});

it('accepts saved factors without depending on current variant rules', () => {
  expect(isScoreMultipliers(multipliers)).toBe(true);
  expect(
    isScoreMultipliers({
      ...multipliers,
      questionTypes: [{ questionType: 'sprite-match', multiplier: 0.75 }],
    }),
  ).toBe(true);
});

it.each([
  { difficulty: 6 },
  { generations: 0 },
  { generations: 10 },
  { generations: 1.5 },
  { questionTypes: [] },
  {
    questionTypes: [...multipliers.questionTypes, ...multipliers.questionTypes],
  },
  { questionTypes: [{ questionType: 'unknown', multiplier: 1.25 }] },
  { questionTypes: [{ questionType: 'ev-yields', multiplier: 100 }] },
  { questionTypes: [{ questionType: 'ev-yields', multiplier: '1.25' }] },
])('rejects malformed saved multipliers: %j', (overrides) => {
  expect(isScoreMultipliers({ ...multipliers, ...overrides })).toBe(false);
});

it.each([
  ['pokedex-scan', 3, 0.75],
  ['sprite-match', 3, 1],
  ['hidden-abilities', 3, undefined],
  ['hidden-abilities', 4, 1.25],
  ['field-notes', 3, 0.75],
  ['field-notes', 5, 1.25],
  ['type-check', 5, 1],
  ['legend-hunt', 5, 0.75],
  ['stat-showdown', 5, 1.25],
] as const)(
  'weights %s at level %i by the current variant introduction',
  (type, level, factor) => {
    expect(getQuestionTypeMultiplier(type, level)).toBe(factor);
  },
);
it('counts unique generations and eligible selected types once, without a form bonus', () => {
  expect(
    getTrainingScoreMultipliers({
      difficulty: 3,
      generations: ['I', 'II', 'II'],
      questionTypes: ['sprite-match', 'sprite-match', 'hidden-abilities'],
    }),
  ).toEqual({
    difficulty: 3,
    generations: 2,
    questionTypes: [{ questionType: 'sprite-match', multiplier: 1 }],
  });
  expect(
    getTrainingScoreMultipliers({
      difficulty: 3,
      generations: [],
      questionTypes: ['sprite-match'],
    }),
  ).toBeUndefined();
});

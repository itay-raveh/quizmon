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
  expect(getScoreMultiplier({ ...multipliers, formGroupCount: 4 })).toBe(
    137.3291015625,
  );
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

it('scores the drawn question mix without rewarding unused selected types', () => {
  const settings = {
    difficulty: 5 as const,
    generations: ['I' as const],
    formGroups: ['standard' as const],
    questionTypes: ['type-check', 'stat-showdown', 'legend-hunt'] as (
      'type-check' | 'stat-showdown' | 'legend-hunt'
    )[],
  };
  const drawn = [
    ...Array.from({ length: 9 }, () => ({
      questionType: 'type-check' as const,
    })),
    { questionType: 'stat-showdown' as const },
  ];
  const actual = getTrainingScoreMultipliers(settings, drawn);
  expect(actual?.perQuestion).toBe(true);
  expect(actual && getScoreMultiplier(actual)).toBe(6.25);
  expect(
    getTrainingScoreMultipliers(settings, [
      ...drawn.slice(0, 9),
      { questionType: 'legend-hunt' },
    ])?.perQuestion,
  ).toBe(true);
  expect(
    getTrainingScoreMultipliers(
      { ...settings, questionTypes: ['type-check', 'stat-showdown'] },
      drawn,
    )?.perQuestion,
  ).toBe(true);
  expect(getTrainingScoreMultipliers(settings, drawn, true)?.questionMix).toBe(
    1.025,
  );
});

it('accepts saved factors without depending on current variant rules', () => {
  expect(isScoreMultipliers(multipliers)).toBe(true);
  expect(isScoreMultipliers({ ...multipliers, formGroupCount: 4 })).toBe(true);
  expect(isScoreMultipliers({ ...multipliers, questionMix: 1.025 })).toBe(true);
  expect(isScoreMultipliers({ ...multipliers, perQuestion: true })).toBe(true);
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
  { formGroupCount: -1 },
  { formGroupCount: 5 },
  { formGroupCount: 1.5 },
  { questionMix: 1.5 },
  { perQuestion: false },
  { perQuestion: true, questionMix: 1 },
  { questionMix: Number.NaN },
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
it('counts unique generations, eligible form groups, and selected types once', () => {
  expect(
    getTrainingScoreMultipliers({
      difficulty: 3,
      formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
      generations: ['I', 'II', 'II'],
      questionTypes: ['sprite-match', 'sprite-match', 'hidden-abilities'],
    }),
  ).toEqual({
    difficulty: 3,
    generations: 2,
    formGroupCount: 1,
    questionTypes: [{ questionType: 'sprite-match', multiplier: 1 }],
  });
  expect(
    getTrainingScoreMultipliers({
      difficulty: 3,
      formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
      generations: ['I', 'VII'],
      questionTypes: ['sprite-match'],
    })?.formGroupCount,
  ).toBe(2);
  expect(
    getTrainingScoreMultipliers({
      difficulty: 3,
      formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
      generations: ['I', 'VI', 'VII', 'VIII'],
      questionTypes: ['sprite-match'],
    })?.formGroupCount,
  ).toBe(4);
  expect(
    getTrainingScoreMultipliers({
      difficulty: 3,
      generations: [],
      questionTypes: ['sprite-match'],
    }),
  ).toBeUndefined();
});

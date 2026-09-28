import {
  getQuestionTypeMultiplier,
  getTrainingScoreMultipliers,
  getScoreMultiplier,
  scoreMultipliersSchema,
} from './score-multipliers';
import type { ScoreMultipliers } from './types';

const multipliers: ScoreMultipliers = {
  difficulty: 5,
  generations: 9,
  questionTypes: [{ questionType: 'evYields', multiplier: 1.25 }],
};
const isScoreMultipliers = (value: unknown) =>
  scoreMultipliersSchema.safeParse(value).success;

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
        { questionType: 'spriteForPokemon', multiplier: 0.75 },
      ],
    }),
  ).toBe(42.1875);
  expect(
    getScoreMultiplier({
      ...multipliers,
      questionTypes: [
        ...multipliers.questionTypes,
        { questionType: 'hiddenAbilities', multiplier: 1.25 },
      ],
    }),
  ).toBe(70.3125);
});

it('uses the Item uses level factors', () => {
  expect(
    ([1, 2, 3, 4, 5] as const).map((level) =>
      getQuestionTypeMultiplier('itemUses', level),
    ),
  ).toEqual([undefined, 0.75, 1, 1.25, 1.25]);
});

it('scores the drawn question mix without rewarding unused selected types', () => {
  const settings = {
    difficulty: 5 as const,
    generations: ['I' as const],
    formGroups: ['standard' as const],
    questionTypes: [
      'pokemonTypes',
      'statExtremes',
      'legendaryMythicalSelection',
    ] as ('pokemonTypes' | 'statExtremes' | 'legendaryMythicalSelection')[],
  };
  const drawn = [
    ...Array.from({ length: 9 }, () => ({
      questionType: 'pokemonTypes' as const,
    })),
    { questionType: 'statExtremes' as const },
  ];
  const actual = getTrainingScoreMultipliers(settings, drawn);
  expect(actual?.perQuestion).toBe(true);
  expect(actual && getScoreMultiplier(actual)).toBe(6.25);
  expect(
    getTrainingScoreMultipliers(settings, [
      ...drawn.slice(0, 9),
      { questionType: 'legendaryMythicalSelection' },
    ])?.perQuestion,
  ).toBe(true);
  expect(
    getTrainingScoreMultipliers(
      { ...settings, questionTypes: ['pokemonTypes', 'statExtremes'] },
      drawn,
    )?.perQuestion,
  ).toBe(true);
});

it('accepts saved factors without depending on current variant rules', () => {
  expect(isScoreMultipliers(multipliers)).toBe(true);
  expect(isScoreMultipliers({ ...multipliers, formGroupCount: 4 })).toBe(true);
  expect(isScoreMultipliers({ ...multipliers, questionMix: 1.025 })).toBe(true);
  expect(isScoreMultipliers({ ...multipliers, perQuestion: true })).toBe(true);
  expect(
    isScoreMultipliers({
      ...multipliers,
      questionTypes: [{ questionType: 'spriteForPokemon', multiplier: 0.75 }],
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
  { questionTypes: [{ questionType: 'evYields', multiplier: 100 }] },
  { questionTypes: [{ questionType: 'evYields', multiplier: '1.25' }] },
])('rejects malformed saved multipliers: %j', (overrides) => {
  expect(isScoreMultipliers({ ...multipliers, ...overrides })).toBe(false);
});

it.each([
  ['pokemonFromHistoricalSprite', 3, 0.75],
  ['itemIdentification', 5, 1.25],
  ['spriteForPokemon', 3, 1],
  ['hiddenAbilities', 3, undefined],
  ['hiddenAbilities', 4, 1.25],
  ['pokedexEntryMatch', 3, 0.75],
  ['pokedexEntryMatch', 5, 1.25],
  ['pokemonTypes', 5, 1],
  ['legendaryMythicalSelection', 5, 0.75],
  ['statExtremes', 5, 1.25],
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
      questionTypes: [
        'spriteForPokemon',
        'spriteForPokemon',
        'hiddenAbilities',
      ],
    }),
  ).toEqual({
    difficulty: 3,
    generations: 2,
    formGroupCount: 1,
    questionTypes: [{ questionType: 'spriteForPokemon', multiplier: 1 }],
  });
  expect(
    getTrainingScoreMultipliers({
      difficulty: 3,
      formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
      generations: ['I', 'VII'],
      questionTypes: ['spriteForPokemon'],
    })?.formGroupCount,
  ).toBe(2);
  expect(
    getTrainingScoreMultipliers({
      difficulty: 3,
      formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
      generations: ['I', 'VI', 'VII', 'VIII'],
      questionTypes: ['spriteForPokemon'],
    })?.formGroupCount,
  ).toBe(4);
  expect(
    getTrainingScoreMultipliers({
      difficulty: 3,
      generations: [],
      questionTypes: ['spriteForPokemon'],
    }),
  ).toBeUndefined();
});

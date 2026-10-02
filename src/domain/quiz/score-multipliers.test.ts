import {
  getTrainingScoreMultipliers,
  getScoreMultiplier,
  scoreMultipliersSchema,
} from './score-multipliers';
import type { ScoreMultipliers } from './types';
import { gameLevels } from './level';
import { questionTypes } from './questions/definitions';
import { calculateScore } from './scoring';
import { getQuestionVariant } from './variants';

const multipliers: ScoreMultipliers = {
  level: 5,
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

it('scores the drawn question mix without rewarding unused selected types', () => {
  const level = gameLevels.find(
    (level) =>
      questionTypes.filter((type) => getQuestionVariant(type, level)).length >=
      3,
  )!;
  const [first, second, unused] = questionTypes.filter((type) =>
    getQuestionVariant(type, level),
  );
  const settings = {
    level,
    generations: ['I' as const],
    formGroups: ['standard' as const],
    questionTypes: [first!, second!, unused!],
  };
  const drawn = [
    ...Array.from({ length: 9 }, () => ({
      questionType: first!,
    })),
    { questionType: second! },
  ];
  const actual = getTrainingScoreMultipliers(settings, drawn);
  expect(actual?.perQuestion).toBe(true);
  const withoutUnused = getTrainingScoreMultipliers(
    { ...settings, questionTypes: [first!, second!] },
    drawn,
  );
  const answers = drawn.map(({ questionType }) => ({
    category: 'identity' as const,
    questionType,
    correct: true,
    points: 1_000,
  }));
  expect(calculateScore(answers, actual)).toBe(
    calculateScore(answers, withoutUnused),
  );
});

it.each([
  { level: 6 },
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

it('counts unique generations, eligible form groups, and selected types once', () => {
  const level = gameLevels.find((level) =>
    getQuestionVariant('spriteForPokemon', level),
  )!;
  const settings = {
    level,
    formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
    generations: ['I', 'II', 'II'],
    questionTypes: ['spriteForPokemon', 'spriteForPokemon', 'hiddenAbilities'],
  } as const;
  const result = getTrainingScoreMultipliers({
    ...settings,
    generations: [...settings.generations],
    formGroups: [...settings.formGroups],
    questionTypes: [...settings.questionTypes],
  });
  const unique = getTrainingScoreMultipliers({
    ...settings,
    generations: ['I', 'II'],
    formGroups: [...settings.formGroups],
    questionTypes: ['spriteForPokemon', 'hiddenAbilities'],
  });
  expect(result).toEqual(unique);
  expect(result?.generations).toBe(2);
  expect(
    getTrainingScoreMultipliers({
      level,
      generations: [],
      questionTypes: ['spriteForPokemon'],
    }),
  ).toBeUndefined();
});

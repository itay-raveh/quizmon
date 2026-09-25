import { z } from 'zod';
import type { GameSettings } from '../settings/types.ts';
import { type Difficulty } from './difficulty.ts';
import type { QuestionData, QuestionType } from './types.ts';
import { generations } from '../pokemon/types.ts';
import { formGroups } from '../pokemon/types.ts';
import { getFormGroup } from '../pokemon/forms.ts';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import { difficultySchema } from './difficulty.ts';
import { questionTypes } from './questions/definitions.ts';

export const scoreMultipliersSchema = z
  .object({
    difficulty: difficultySchema,
    generations: z.int().min(1).max(generations.length),
    formGroupCount: z.int().min(0).max(formGroups.length).optional(),
    questionMix: z.number().min(0.75).max(1.25).optional(),
    perQuestion: z.literal(true).optional(),
    questionTypes: z
      .array(
        z.object({
          questionType: z.enum(questionTypes),
          multiplier: z.literal([0.75, 1, 1.25]),
        }),
      )
      .min(1)
      .refine(
        (factors) =>
          new Set(factors.map(({ questionType }) => questionType)).size ===
          factors.length,
      ),
  })
  .refine(
    ({ perQuestion, questionMix }) => !perQuestion || questionMix === undefined,
  );

export const savedScoreMultipliersSchema = z
  .object({
    ...scoreMultipliersSchema.shape,
    questionTypes: z
      .array(
        z.object({
          questionType: z.string().min(1).max(200),
          multiplier: z.literal([0.75, 1, 1.25]),
        }),
      )
      .min(1)
      .refine(
        (factors) =>
          new Set(factors.map(({ questionType }) => questionType)).size ===
          factors.length,
      ),
  })
  .refine(
    ({ perQuestion, questionMix }) => !perQuestion || questionMix === undefined,
  );

export type ScoreMultipliers = z.infer<typeof savedScoreMultipliersSchema>;
const formGroupGenerations = new Map(
  formGroups.map((group) => [group, new Set<string>()]),
);
for (const [name, generation] of Object.entries(pokemonGenerations))
  formGroupGenerations.get(getFormGroup(name))?.add(generation);

export const getQuestionTypesMultiplier = (
  factors: ScoreMultipliers['questionTypes'],
  questionMix?: number,
): number =>
  questionMix ??
  0.75 ** factors.filter(({ multiplier }) => multiplier === 0.75).length *
    1.25 ** factors.filter(({ multiplier }) => multiplier === 1.25).length;

export const getScoreMultiplier = (multipliers: ScoreMultipliers): number =>
  multipliers.difficulty *
  multipliers.generations *
  1.25 ** (multipliers.formGroupCount ?? 0) *
  getQuestionTypesMultiplier(
    multipliers.questionTypes,
    multipliers.perQuestion ? 1 : multipliers.questionMix,
  );

export const getQuestionTypeMultiplier = (
  type: QuestionType,
  difficulty: Difficulty,
): 0.75 | 1 | 1.25 | undefined =>
  questionScoreFactors[type][difficulty - 1] ?? undefined;

const questionScoreFactors: Record<
  QuestionType,
  readonly (0.75 | 1 | 1.25 | null)[]
> = {
  'item-identification': [0.75, 0.75, 1, 1, 1],
  'medicine-cabinet': [null, 0.75, 1, 1.25, 1.25],
  'weight-comparison': [null, 0.75, 1, 1.25, 1.25],
  'height-comparison': [null, 0.75, 1, 1.25, 1.25],
  'move-types': [null, 0.75, 1, 1, 1],
  'name-that-region': [null, 0.75, 1, 1, 1],
  'move-purpose': [null, 0.75, 1, 1.25, 1.25],
  'pokedex-categories': [null, 0.75, 1, 1, 1.25],
  'evolution-conditions': [null, null, 1, 1.25, 1.25],
  'ability-effects': [null, null, 1, 1.25, 1.25],
  'held-item-effects': [null, null, 1, 1.25, 1.25],
  'hidden-abilities': [null, null, null, 1.25, 1.25],
  'nature-effects': [null, null, null, 1.25, 1.25],
  'ev-yields': [null, null, null, 1.25, 1.25],
  'encounter-locations': [null, null, null, 1.25, 1.25],
  'berry-flavors': [null, null, null, 1.25, 1.25],
  'natural-gift': [null, null, null, null, 1.25],
  'pokedex-scan': [0.75, 0.75, 0.75, 1.25, 1.25],
  'silhouette-match': [null, 0.75, 0.75, 1.25, 1.25],
  'sprite-match': [0.75, 0.75, 1, 1.25, 1.25],
  'whos-that-pokemon': [null, 0.75, 1, 1, 1.25],
  'pixel-peek': [null, null, 1, 1.25, 1.25],
  'shiny-spotter': [null, null, 1, 1.25, 1.25],
  'field-notes': [null, 0.75, 0.75, 1.25, 1.25],
  'type-check': [null, 0.75, 1, 1, 1],
  'odd-one-out': [null, 0.75, 1, 1, 1],
  'type-roundup': [null, 0.75, 1, 1, 1],
  'type-twins': [null, null, 1, 1, 1],
  'legend-hunt': [null, 0.75, 0.75, 0.75, 0.75],
  'generation-roundup': [null, 0.75, 0.75, 0.75, 0.75],
  'evolution-link': [null, 0.75, 0.75, 1.25, 1.25],
  'evolution-shift': [null, null, 1, 1, 1.25],
  'ability-check': [null, null, 1, 1, 1.25],
  'move-check': [null, null, null, 1.25, 1.25],
  'stat-showdown': [null, null, 1, 1.25, 1.25],
  'type-matchup': [0.75, 0.75, 1, 1.25, 1.25],
  'counter-pick': [null, 0.75, 1, 1.25, 1.25],
};

export const getTrainingScoreMultipliers = (
  settings: Pick<GameSettings, 'difficulty' | 'generations' | 'questionTypes'> &
    Partial<Pick<GameSettings, 'formGroups'>>,
  questions?: readonly Pick<QuestionData, 'questionType'>[],
): ScoreMultipliers | undefined => {
  if (!settings.difficulty || !settings.generations.length) return undefined;
  const difficulty = settings.difficulty;
  const factors = [...new Set(settings.questionTypes)].flatMap(
    (questionType) => {
      const multiplier = getQuestionTypeMultiplier(questionType, difficulty);
      return multiplier === undefined ? [] : [{ questionType, multiplier }];
    },
  );
  const actualFactors = questions?.map(
    ({ questionType }) =>
      factors.find((factor) => factor.questionType === questionType)
        ?.multiplier,
  );
  if (
    actualFactors &&
    (!actualFactors.length || actualFactors.includes(undefined))
  )
    return undefined;
  const selectedGenerations = new Set<string>(settings.generations);
  const formGroupCount = formGroups.filter(
    (group) =>
      (settings.formGroups ?? formGroups).includes(group) &&
      [...formGroupGenerations.get(group)!].some((generation) =>
        selectedGenerations.has(generation),
      ),
  ).length;
  return factors.length
    ? {
        difficulty,
        generations: selectedGenerations.size,
        formGroupCount,
        ...(actualFactors ? { perQuestion: true as const } : {}),
        questionTypes: factors,
      }
    : undefined;
};

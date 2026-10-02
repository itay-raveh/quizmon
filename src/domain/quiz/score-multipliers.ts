import { z } from 'zod';
import type { GameSettings } from '../settings/types.ts';
import { type Level } from './level.ts';
import type { QuestionData, QuestionType } from './types.ts';
import { generations } from '../pokemon/types.ts';
import { formGroups } from '../pokemon/types.ts';
import { getFormGroup } from '../pokemon/forms.ts';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import { levelSchema } from './level.ts';
import { questionTypes } from './questions/definitions.ts';
import { getQuestionVariant } from './variants.ts';
import { getTrainingRuleFactor } from './training-scoring.ts';

const legacyScoreMultipliersSchema = z
  .object({
    version: z.literal(1).optional(),
    level: levelSchema,
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

const trainingScoreMultipliersSchema = z
  .object({
    version: z.literal(2),
    level: levelSchema,
    questionTypes: z
      .array(
        z.object({
          questionType: z.enum(questionTypes),
          ruleLevel: levelSchema,
        }),
      )
      .min(1)
      .refine(
        (factors) =>
          new Set(factors.map(({ questionType }) => questionType)).size ===
          factors.length,
      ),
  })
  .refine(({ level, questionTypes: factors }) =>
    factors.every(({ ruleLevel }) => ruleLevel <= level),
  );

export const scoreMultipliersSchema = z.union([
  trainingScoreMultipliersSchema,
  legacyScoreMultipliersSchema,
]);

export type LegacyScoreMultipliers = z.infer<
  typeof legacyScoreMultipliersSchema
>;
export type TrainingScoreMultipliers = z.infer<
  typeof trainingScoreMultipliersSchema
>;
export type ScoreMultipliers = z.infer<typeof scoreMultipliersSchema>;
const formGroupGenerations = new Map(
  formGroups.map((group) => [group, new Set<string>()]),
);
for (const [name, generation] of Object.entries(pokemonGenerations))
  formGroupGenerations.get(getFormGroup(name))?.add(generation);

export const getQuestionTypesMultiplier = (
  factors: LegacyScoreMultipliers['questionTypes'],
  questionMix?: number,
): number =>
  questionMix ??
  0.75 ** factors.filter(({ multiplier }) => multiplier === 0.75).length *
    1.25 ** factors.filter(({ multiplier }) => multiplier === 1.25).length;

export const getScoreMultiplier = (
  multipliers: LegacyScoreMultipliers,
): number =>
  multipliers.level *
  multipliers.generations *
  1.25 ** (multipliers.formGroupCount ?? 0) *
  getQuestionTypesMultiplier(
    multipliers.questionTypes,
    multipliers.perQuestion ? 1 : multipliers.questionMix,
  );

export const getQuestionTypeMultiplier = (
  type: QuestionType,
  level: Level,
): number | undefined => {
  const variantLevel = getQuestionVariant(type, level)?.level;
  if (variantLevel === undefined) return undefined;
  return getTrainingRuleFactor(level, variantLevel);
};

export const getTrainingScoreMultipliers = (
  settings: Pick<GameSettings, 'level' | 'generations' | 'questionTypes'> &
    Partial<Pick<GameSettings, 'formGroups'>>,
  questions?: readonly Pick<QuestionData, 'questionType' | 'variantLevel'>[],
): TrainingScoreMultipliers | undefined => {
  if (!settings.level || !settings.generations.length) return undefined;
  const level = settings.level;
  const drawn: readonly Pick<QuestionData, 'questionType' | 'variantLevel'>[] =
    questions ??
    settings.questionTypes.map((questionType) => ({
      questionType,
    }));
  const drawnTypes = [
    ...new Set(drawn.map(({ questionType }) => questionType)),
  ];
  const factors = drawnTypes.flatMap((questionType) => {
    if (
      questionType === 'champion' ||
      !settings.questionTypes.includes(questionType)
    )
      return [];
    const savedLevel = drawn.find(
      (question) => question.questionType === questionType,
    )?.variantLevel;
    const ruleLevel =
      savedLevel ?? getQuestionVariant(questionType, level)?.level;
    return ruleLevel && ruleLevel <= level ? [{ questionType, ruleLevel }] : [];
  });
  if (!factors.length || factors.length !== drawnTypes.length) return undefined;
  return { version: 2, level, questionTypes: factors };
};

export const getLegacyTrainingScoreMultipliers = (
  settings: Pick<GameSettings, 'level' | 'generations' | 'questionTypes'> &
    Partial<Pick<GameSettings, 'formGroups'>>,
  questions?: readonly Pick<QuestionData, 'questionType'>[],
): LegacyScoreMultipliers | undefined => {
  if (!settings.level || !settings.generations.length) return undefined;
  const level = settings.level;
  const factors = [...new Set(settings.questionTypes)].flatMap(
    (questionType) => {
      const variantLevel = getQuestionVariant(questionType, level)?.level;
      if (variantLevel === undefined) return [];
      const multiplier: 0.75 | 1 | 1.25 =
        variantLevel <= 2 ? 0.75 : variantLevel === 3 ? 1 : 1.25;
      return [{ questionType, multiplier }];
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
        level,
        generations: selectedGenerations.size,
        formGroupCount,
        ...(actualFactors ? { perQuestion: true as const } : {}),
        questionTypes: factors,
      }
    : undefined;
};

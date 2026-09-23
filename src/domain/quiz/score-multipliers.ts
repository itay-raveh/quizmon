import type { GameSettings } from '../settings/types.ts';
import { difficultyLevels, type Difficulty } from './difficulty.ts';
import { getQuestionVariant } from './question-variants.ts';
import type { QuestionData, QuestionType } from './types.ts';
import { isRecord } from '../../lib/validation.ts';
import { generations } from '../pokemon/types.ts';
import { formGroups } from '../pokemon/types.ts';
import { getFormGroup } from '../pokemon/forms.ts';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import { isDifficulty } from './difficulty.ts';
import { questionTypes } from './questions/definitions.ts';
import { type ScoreMultipliers } from './types.ts';

const savedQuestionTypes: readonly string[] = [...questionTypes];
const formGroupGenerations = new Map(
  formGroups.map((group) => [group, new Set<string>()]),
);
for (const [name, generation] of Object.entries(pokemonGenerations))
  formGroupGenerations.get(getFormGroup(name))?.add(generation);

export const isScoreMultipliers = (value: unknown): value is ScoreMultipliers =>
  isRecord(value) &&
  isDifficulty(value.difficulty) &&
  typeof value.generations === 'number' &&
  Number.isInteger(value.generations) &&
  value.generations >= 1 &&
  value.generations <= generations.length &&
  (value.formGroupCount === undefined ||
    (typeof value.formGroupCount === 'number' &&
      Number.isInteger(value.formGroupCount) &&
      value.formGroupCount >= 0 &&
      value.formGroupCount <= formGroups.length)) &&
  (value.questionMix === undefined ||
    (typeof value.questionMix === 'number' &&
      Number.isFinite(value.questionMix) &&
      value.questionMix >= 0.75 &&
      value.questionMix <= 1.25)) &&
  (value.perQuestion === undefined || value.perQuestion === true) &&
  !(value.perQuestion && value.questionMix !== undefined) &&
  Array.isArray(value.questionTypes) &&
  value.questionTypes.length > 0 &&
  value.questionTypes.every(
    (entry: unknown): entry is ScoreMultipliers['questionTypes'][number] =>
      isRecord(entry) &&
      typeof entry.questionType === 'string' &&
      savedQuestionTypes.includes(entry.questionType) &&
      [0.75, 1, 1.25].includes(entry.multiplier as number),
  ) &&
  new Set(value.questionTypes.map((entry) => entry.questionType)).size ===
    value.questionTypes.length;

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
): 0.75 | 1 | 1.25 | undefined => {
  let introduction: Difficulty | undefined;
  let previous: string | undefined;
  for (const level of difficultyLevels) {
    if (level > difficulty) break;
    const resolved = getQuestionVariant(type, level);
    if (!resolved) continue;
    const variant = JSON.stringify(resolved.variant);
    if (variant !== previous) introduction = level;
    previous = variant;
  }
  return introduction === undefined
    ? undefined
    : introduction <= 2
      ? 0.75
      : introduction === 3
        ? 1
        : 1.25;
};

export const getTrainingScoreMultipliers = (
  settings: Pick<GameSettings, 'difficulty' | 'generations' | 'questionTypes'> &
    Partial<Pick<GameSettings, 'formGroups'>>,
  questions?: readonly Pick<QuestionData, 'questionType'>[],
  legacyAverage = false,
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
        ...(actualFactors
          ? legacyAverage
            ? {
                questionMix:
                  actualFactors.reduce<number>(
                    (sum, factor) => sum + factor!,
                    0,
                  ) / actualFactors.length,
              }
            : { perQuestion: true as const }
          : {}),
        questionTypes: factors,
      }
    : undefined;
};

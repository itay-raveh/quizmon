import type { GameSettings } from '../settings/types.ts';
import { type Difficulty } from './difficulty.ts';
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
): 0.75 | 1 | 1.25 | undefined =>
  questionScoreFactors[type][difficulty - 1] ?? undefined;

const questionScoreFactors: Record<
  QuestionType,
  readonly (0.75 | 1 | 1.25 | null)[]
> = {
  'item-identification': [0.75, 0.75, 1, 1, 1],
  'medicine-cabinet': [0.75, 0.75, 1, 1, 1],
  'evolution-items': [0.75, 0.75, 1, 1.25, 1.25],
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

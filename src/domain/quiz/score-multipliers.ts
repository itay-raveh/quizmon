import type { GameSettings } from '../settings/types';
import { difficultyLevels, type Difficulty } from './difficulty';
import { getQuestionVariant } from './question-variants';
import type { QuestionType } from './types';
import { isRecord } from '../../lib/validation';
import { generations } from '../pokemon/types';
import { isDifficulty } from './difficulty';
import { questionTypes } from './questions/definitions';
import { type ScoreMultipliers } from './types';

const savedQuestionTypes: readonly string[] = [...questionTypes];

export const isScoreMultipliers = (value: unknown): value is ScoreMultipliers =>
  isRecord(value) &&
  isDifficulty(value.difficulty) &&
  typeof value.generations === 'number' &&
  Number.isInteger(value.generations) &&
  value.generations >= 1 &&
  value.generations <= generations.length &&
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
): number =>
  0.75 ** factors.filter(({ multiplier }) => multiplier === 0.75).length *
  1.25 ** factors.filter(({ multiplier }) => multiplier === 1.25).length;

export const getScoreMultiplier = (multipliers: ScoreMultipliers): number =>
  multipliers.difficulty *
  multipliers.generations *
  getQuestionTypesMultiplier(multipliers.questionTypes);

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
  settings: Pick<GameSettings, 'difficulty' | 'generations' | 'questionTypes'>,
): ScoreMultipliers | undefined => {
  if (!settings.difficulty || !settings.generations.length) return undefined;
  const difficulty = settings.difficulty;
  const factors = [...new Set(settings.questionTypes)].flatMap(
    (questionType) => {
      const multiplier = getQuestionTypeMultiplier(questionType, difficulty);
      return multiplier === undefined ? [] : [{ questionType, multiplier }];
    },
  );
  return factors.length
    ? {
        difficulty,
        generations: new Set(settings.generations).size,
        questionTypes: factors,
      }
    : undefined;
};

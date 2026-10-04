import { gameLevels, type Level } from './level.ts';
import { questionRules } from './question-rules/registry.ts';
import type { ResponseStrategy } from './questions/response-strategies.ts';
import type { QuestionData, QuestionType } from './types.ts';
import { getQuestionVariant } from './variants.ts';

export const trainingScoring = {
  basePoints: 1000,
  levelFactor: 1.6,
  carriedRuleFactor: 0.8,
  levelBonus: 0.5,
  speedBonusRate: 0.5,
  speedBonusHalfLifeMilliseconds: 10_000,
} as const;

const getTrainingLevelFactor = (level: number): number =>
  trainingScoring.levelFactor ** (level - 1);

const getTrainingRuleFactor = (level: number, startLevel: number): number =>
  getTrainingLevelFactor(level) *
  trainingScoring.carriedRuleFactor ** (level - startLevel);

export const getTrainingAnswerFactor = (
  type: QuestionData['questionType'],
  level: Level,
): number => {
  const rules = questionRules[type].levels as Partial<
    Record<
      Level,
      { response: Pick<ResponseStrategy, 'kind' | 'selection'> } | null
    >
  >;
  const configured = gameLevels.filter((candidate) => rules[candidate]);
  const currentLevel = [...configured]
    .reverse()
    .find((candidate) => candidate <= level);
  const firstLevel = configured[0];
  if (!firstLevel) throw new Error('Question type has no scoring rule');
  if (!currentLevel)
    return Math.round(
      getTrainingLevelFactor(level) + trainingScoring.levelBonus * (level - 1),
    );
  const response = rules[currentLevel]!.response;
  const formatLevel = configured.find((candidate) => {
    const earlier = rules[candidate]!.response;
    return (
      earlier.kind === response.kind && earlier.selection === response.selection
    );
  })!;
  return Math.round(
    (getTrainingRuleFactor(level, firstLevel) +
      getTrainingRuleFactor(level, formatLevel)) /
      2 +
      trainingScoring.levelBonus * (level - 1),
  );
};

export const getQuestionTypeMultiplier = (
  type: QuestionType,
  level: Level,
): number | undefined => {
  const variantLevel = getQuestionVariant(type, level)?.level;
  return variantLevel === undefined
    ? undefined
    : getTrainingAnswerFactor(type, level);
};

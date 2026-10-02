import { gameLevels, type Level } from './level.ts';
import { questionRules } from './question-rules/registry.ts';
import type { QuestionType } from './types.ts';
import { getQuestionVariant } from './variants.ts';

export const trainingScoring = {
  basePoints: 1000,
  levelFactor: 1.6,
  carriedRuleFactor: 0.8,
  speedBonusRate: 0.5,
  speedBonusHalfLifeMilliseconds: 10_000,
} as const;

export const getTrainingLevelFactor = (level: number): number =>
  trainingScoring.levelFactor ** (level - 1);

export const getTrainingRuleFactor = (
  level: number,
  ruleLevel: number,
): number => trainingScoring.carriedRuleFactor ** (level - ruleLevel);

export const getScoringRuleLevel = (
  type: QuestionType,
  level: Level,
): Level => {
  const rules = questionRules[type].levels as Partial<
    Record<Level, object | null>
  >;
  const applicable = [...gameLevels]
    .reverse()
    .find((candidate) => candidate <= level && rules[candidate]);
  if (applicable) return applicable;
  const first = gameLevels.find((candidate) => rules[candidate]);
  if (!first) throw new Error('Question type has no scoring rule');
  return level;
};

export const getTrainingAnswerFactor = (
  type: QuestionType,
  level: Level,
): number =>
  getTrainingLevelFactor(level) *
  getTrainingRuleFactor(level, getScoringRuleLevel(type, level));

export const getQuestionTypeMultiplier = (
  type: QuestionType,
  level: Level,
): number | undefined => {
  const variantLevel = getQuestionVariant(type, level)?.level;
  return variantLevel === undefined
    ? undefined
    : getTrainingLevelFactor(level) *
        getTrainingRuleFactor(level, variantLevel);
};

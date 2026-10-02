import type { Level } from './level.ts';
import {
  getTrainingLevelFactor,
  getTrainingRuleFactor,
  getScoringRuleLevel,
  trainingScoring,
} from './training-scoring.ts';
import type { QuestionData, SavedAnswerResult } from './types.ts';

export interface ScoringRules {
  baseQuestionPoints: number;
  championPoints: readonly number[];
  speedBonusRate: number;
  speedBonusHalfLifeMilliseconds: number;
  speedBonusRounding: number;
}

const scoringRules: ScoringRules = {
  baseQuestionPoints: 1000,
  championPoints: [1000, 750, 500, 250],
  speedBonusRate: 3,
  speedBonusHalfLifeMilliseconds: 5000,
  speedBonusRounding: 10,
};
export const getAnswerPoints = (
  question: Pick<QuestionData, 'category'>,
  correct: boolean,
  assistsUsed = 0,
  rules: ScoringRules = scoringRules,
): number => {
  const { baseQuestionPoints, championPoints } = rules;
  if (!correct) return 0;
  if (question.category !== 'champion') return baseQuestionPoints;
  return championPoints[Math.max(0, assistsUsed)] ?? championPoints.at(-1)!;
};

export const getSpeedBonusPoints = (
  knowledgePoints: number,
  responseMilliseconds: number,
  rules: ScoringRules = scoringRules,
): number => {
  const { speedBonusRate, speedBonusHalfLifeMilliseconds, speedBonusRounding } =
    rules;
  if (knowledgePoints <= 0) return 0;
  const elapsedMilliseconds = Math.max(0, responseMilliseconds);
  const bonus =
    knowledgePoints *
    speedBonusRate *
    2 ** (-elapsedMilliseconds / speedBonusHalfLifeMilliseconds);
  return Math.round(bonus / speedBonusRounding) * speedBonusRounding;
};

export const getScoreBreakdown = (
  answers: readonly SavedAnswerResult[],
  rules: ScoringRules = scoringRules,
) => {
  const knowledge = answers.reduce((total, answer) => total + answer.points, 0);
  const speed = answers.reduce(
    (total, answer) => total + (answer.speedBonus ?? 0),
    0,
  );
  const mastery =
    answers.length === 0
      ? 0
      : Math.round(
          (knowledge * knowledge) / (answers.length * rules.baseQuestionPoints),
        );
  return { knowledge, speed, mastery };
};

export const getTrainingScoreBreakdown = (
  answers: readonly SavedAnswerResult[],
  level: Level,
) => {
  let earned = 0;
  let total = 0;
  for (const answer of answers) {
    if (!answer.correct) continue;
    if (!answer.questionType || answer.questionType === 'champion')
      throw new Error('Missing question score factor');
    const ruleLevel = getScoringRuleLevel(answer.questionType, level);
    const base =
      trainingScoring.basePoints *
      getTrainingLevelFactor(level) *
      getTrainingRuleFactor(level, ruleLevel);
    const speed =
      base *
      trainingScoring.speedBonusRate *
      2 **
        (-Math.max(0, answer.responseMilliseconds ?? Infinity) /
          trainingScoring.speedBonusHalfLifeMilliseconds);
    earned += base;
    total += base + speed;
  }
  const answersPoints = Math.round(earned);
  const score = Math.round(total);
  return { answers: answersPoints, speed: score - answersPoints, score };
};

export const calculateScore = (
  answers: readonly SavedAnswerResult[],
  rules: ScoringRules = scoringRules,
): number => {
  const { knowledge, speed, mastery } = getScoreBreakdown(answers, rules);
  return knowledge + speed + mastery;
};

export const isQuestionAnswerCorrect = (
  question: QuestionData,
  selectedOptions: readonly string[],
): boolean => {
  const selected = new Set(selectedOptions);
  return (
    selected.size === question.answer.correctOptions.length &&
    question.answer.correctOptions.every((option) => selected.has(option))
  );
};

export const getResponseTime = (
  answers: readonly Pick<SavedAnswerResult, 'responseMilliseconds'>[],
) => {
  const elapsedMilliseconds = answers.reduce(
    (total, answer) => total + (answer.responseMilliseconds ?? 0),
    0,
  );
  return {
    elapsedMilliseconds,
    elapsedSeconds: Math.floor(elapsedMilliseconds / 1_000),
  };
};

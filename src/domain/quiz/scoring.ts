import { gameVersions } from '../versions.ts';
import { getScoreMultiplier } from './score-multipliers.ts';
import type {
  GameResult,
  QuestionData,
  SavedAnswerResult,
  ScoreMultipliers,
} from './types.ts';

export interface ScoringRules {
  baseQuestionPoints: number;
  championPoints: readonly number[];
  speedBonusRate: number;
  speedBonusHalfLifeMilliseconds: number;
  speedBonusRounding: number;
}

export const scoringRules: ScoringRules = {
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

export const SCORE_VERSION = gameVersions.score;

export const getUnifiedScoreKey = (
  result: Pick<GameResult, 'scoreVersion'>,
): `score:${number}` => `score:${result.scoreVersion ?? SCORE_VERSION}`;

export const calculateScore = (
  answers: readonly SavedAnswerResult[],
  multipliers?: ScoreMultipliers,
  rules: ScoringRules = scoringRules,
): number => {
  const { knowledge, speed, mastery } = getScoreBreakdown(answers, rules);
  return Math.round(
    (knowledge + speed + mastery) *
      (multipliers ? getScoreMultiplier(multipliers) : 1),
  );
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

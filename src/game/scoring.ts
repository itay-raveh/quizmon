import type { QuestionData, SavedAnswerResult } from './types';

const baseQuestionPoints = 1_000;
const championPoints = [baseQuestionPoints, 750, 500, 250] as const;

export const getAnswerPoints = (
  question: Pick<QuestionData, 'category'>,
  correct: boolean,
  assistsUsed = 0,
): number => {
  if (!correct) return 0;
  if (question.category !== 'champion') return baseQuestionPoints;
  return championPoints[Math.max(0, Math.min(3, assistsUsed))] ?? 250;
};

const speedBonusRate = 3;
const speedBonusHalfLifeMilliseconds = 5_000;

export const getSpeedBonusPoints = (
  knowledgePoints: number,
  responseMilliseconds: number,
): number => {
  if (knowledgePoints <= 0) return 0;
  const elapsedMilliseconds = Math.max(0, responseMilliseconds);
  const bonus =
    knowledgePoints *
    speedBonusRate *
    2 ** (-elapsedMilliseconds / speedBonusHalfLifeMilliseconds);
  return Math.round(bonus / 10) * 10;
};

export const getScoreBreakdown = (answers: readonly SavedAnswerResult[]) => {
  const knowledge = answers.reduce((total, answer) => total + answer.points, 0);
  const speed = answers.reduce(
    (total, answer) => total + (answer.speedBonus ?? 0),
    0,
  );
  const mastery =
    answers.length === 0
      ? 0
      : Math.round(
          (knowledge * knowledge) / (answers.length * baseQuestionPoints),
        );
  return { knowledge, speed, mastery };
};

export const SCORE_VERSION = 2;

export const calculateScore = (
  answers: readonly SavedAnswerResult[],
): number => {
  const { knowledge, speed, mastery } = getScoreBreakdown(answers);
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

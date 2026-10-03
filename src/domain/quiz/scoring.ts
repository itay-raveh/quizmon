import { championClueFactors } from './question-rules/champion.ts';
import { DAILY_LEVEL } from './daily.ts';
import { getLeagueStage } from './league.ts';
import type { Level } from './level.ts';
import {
  getTrainingAnswerFactor,
  trainingScoring,
} from './training-scoring.ts';
import type { GameMode, QuestionData, SavedAnswerResult } from './types.ts';

type ScoringAnswer = Pick<
  SavedAnswerResult,
  'questionType' | 'correct' | 'cluesUsed' | 'responseMilliseconds'
>;

export const getRoundAnswerLevel = (
  mode: GameMode,
  selectedLevel: Level | undefined,
  index: number,
): Level => {
  if (mode.kind === 'daily') return DAILY_LEVEL;
  if (mode.kind === 'league') return getLeagueStage(index + 1).level;
  if (!selectedLevel)
    throw new Error('Training level is required to score a round.');
  return selectedLevel;
};

export const getQuestionScoreFactor = (
  questionType: QuestionData['questionType'],
  level: Level,
  cluesUsed = 0,
): number => {
  const clueFactor =
    questionType === 'champion'
      ? championClueFactors[
          Math.min(Math.max(0, cluesUsed), championClueFactors.length - 1)
        ]!
      : 1;
  return getTrainingAnswerFactor(questionType, level) * clueFactor;
};

const rawAward = (answer: ScoringAnswer, level: Level) => {
  if (!answer.correct) return { base: 0, speed: 0 };
  if (!answer.questionType) throw new Error('Missing question score factor');
  const base =
    trainingScoring.basePoints *
    getQuestionScoreFactor(answer.questionType, level, answer.cluesUsed);
  const speed =
    base *
    trainingScoring.speedBonusRate *
    2 **
      (-Math.max(0, answer.responseMilliseconds ?? Infinity) /
        trainingScoring.speedBonusHalfLifeMilliseconds);
  return { base, speed };
};

export const getScoreBreakdown = (
  answers: readonly ScoringAnswer[],
  level: Level | ((index: number) => Level),
) => {
  let earned = 0;
  let total = 0;
  let roundedEarned = 0;
  let roundedTotal = 0;
  const awards = answers.map((answer, index) => {
    const award = rawAward(
      answer,
      typeof level === 'function' ? level(index) : level,
    );
    earned += award.base;
    total += award.base + award.speed;
    const nextEarned = Math.round(earned);
    const nextTotal = Math.round(total);
    const points = nextEarned - roundedEarned;
    const speedBonus = nextTotal - roundedTotal - points;
    roundedEarned = nextEarned;
    roundedTotal = nextTotal;
    return { points, speedBonus, score: nextTotal };
  });
  return {
    answers: roundedEarned,
    speed: roundedTotal - roundedEarned,
    score: roundedTotal,
    awards,
  };
};

export const getQuestionScore = (answer: ScoringAnswer, level: Level) =>
  getScoreBreakdown([answer], level);

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

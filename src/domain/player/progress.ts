import { questionTypes } from '../quiz/questions/definitions';

import { TRAINER_PROGRESS_VERSION, type SavedResults } from './results';

import {
  isLeagueTraining,
  TRAINING_QUESTION_COUNT,
} from '../settings/game-settings';

import { isChoice } from '../../lib/validation';

import {
  questionCategories,
  type GameMode,
  type GameResult,
} from '../quiz/types';

import { type GameSettings } from '../settings/types';

export interface TrainerStats extends Omit<
  SavedResults['progress'],
  'version'
> {
  bestDailyStreak: number;
  pokedex?: string[];
  leagueCompleted: boolean;
}

export const addResultToProgress = (
  progress: SavedResults['progress'],
  result: GameResult,
  mode: GameMode,
  settings: GameSettings,
): SavedResults['progress'] => {
  const correctCategories = { ...progress.correctCategories };
  const correctGenerations = { ...progress.correctGenerations };
  const correctPokemon = new Set(progress.correctPokemon);
  const correctQuestionTypes = { ...progress.correctQuestionTypes };
  let championAnswersWithoutClues = progress.championAnswersWithoutClues;

  for (const answer of result.answers) {
    if (!answer.correct) continue;

    if (isChoice(answer.category, questionCategories)) {
      const category = answer.category;
      correctCategories[category] = (correctCategories[category] ?? 0) + 1;
    }
    if (answer.pokemonName) correctPokemon.add(answer.pokemonName);
    if (answer.generation) {
      correctGenerations[answer.generation] =
        (correctGenerations[answer.generation] ?? 0) + 1;
    }
    if (answer.questionType === 'champion') {
      championAnswersWithoutClues += Number(answer.cluesUsed === 0);
    } else if (isChoice(answer.questionType, questionTypes)) {
      const questionType = answer.questionType;
      correctQuestionTypes[questionType] =
        (correctQuestionTypes[questionType] ?? 0) + 1;
    }
  }

  const isPerfect = result.correctCount === result.questionCount;
  const isLeagueRound =
    mode.kind === 'training' &&
    result.questionCount === TRAINING_QUESTION_COUNT &&
    isLeagueTraining(settings);
  const earnedQuickAttack =
    isLeagueRound && result.correctCount >= 8 && result.elapsedSeconds < 60;

  return {
    championAnswersWithoutClues,
    correctCategories,
    correctGenerations,
    correctPokemon: [...correctPokemon],
    correctQuestionTypes,
    masteryRounds: progress.masteryRounds + Number(isLeagueRound && isPerfect),
    quickAttackRounds:
      (progress.quickAttackRounds ?? Number(progress.quickAttackCompleted)) +
      Number(earnedQuickAttack),
    quickAttackCompleted: progress.quickAttackCompleted || earnedQuickAttack,
    version: TRAINER_PROGRESS_VERSION,
  };
};

const previousDailyDate = (date: string): string => {
  const previous = new Date(`${date}T00:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
};

export const getDailyStreak = (
  dates: readonly string[],
  today: string,
): number => {
  const creditedDates = new Set(dates);
  let date = creditedDates.has(today) ? today : previousDailyDate(today);
  let streak = 0;

  while (creditedDates.has(date)) {
    streak += 1;
    date = previousDailyDate(date);
  }

  return streak;
};

const getLongestStreak = (dates: readonly string[]): number => {
  let longest = 0;
  let current = 0;
  let previous: string | undefined;

  for (const date of [...new Set(dates)].sort()) {
    current =
      previous && previousDailyDate(date) === previous ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  }

  return longest;
};

export const getTrainerStats = (
  results: SavedResults,
  pokedex?: string[],
): TrainerStats => ({
  pokedex,
  bestDailyStreak: getLongestStreak(results.streak.creditedDates),
  championAnswersWithoutClues: results.progress.championAnswersWithoutClues,
  correctCategories: results.progress.correctCategories,
  correctGenerations: results.progress.correctGenerations,
  correctPokemon: results.progress.correctPokemon,
  correctQuestionTypes: results.progress.correctQuestionTypes,
  leagueCompleted: results.league.completed,
  masteryRounds: results.progress.masteryRounds,
  quickAttackCompleted: results.progress.quickAttackCompleted,
  quickAttackRounds: results.progress.quickAttackRounds,
});

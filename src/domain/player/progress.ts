import { type GameMode, type GameResult } from '../quiz/types.ts';
import {
  getTrainingSettings,
  isLeagueTraining,
  TRAINING_QUESTION_COUNT,
} from '../settings/game-settings.ts';
import { type GameSettings } from '../settings/types.ts';
import { type SavedResults } from './results.ts';

export type TrainerStats = SavedResults['progress'] & {
  bestDailyStreak: number;
  pokedex?: string[];
  leagueCompleted: boolean;
};
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
    correctCategories[answer.category] =
      (correctCategories[answer.category] ?? 0) + 1;
    if (answer.subject?.kind === 'pokemon' && answer.subject.name)
      correctPokemon.add(answer.subject.name);
    if (answer.subject?.kind === 'pokemon' && answer.subject.generation) {
      correctGenerations[answer.subject.generation] =
        (correctGenerations[answer.subject.generation] ?? 0) + 1;
    }
    if (answer.questionType === 'champion') {
      championAnswersWithoutClues += Number(
        answer.unassistedSearch ?? answer.cluesUsed === 0,
      );
    } else if (
      answer.questionType !== undefined &&
      answer.questionType !== 'archived'
    ) {
      const questionType = answer.questionType;
      correctQuestionTypes[questionType] =
        (correctQuestionTypes[questionType] ?? 0) + 1;
    }
  }
  const isPerfect = result.correctCount === result.questionCount;
  const isLeagueRound =
    mode.kind === 'training' &&
    result.questionCount === TRAINING_QUESTION_COUNT &&
    (result.rules
      ? (() => {
          const automatic =
            result.rules.automaticQuestionTypes ??
            settings.automaticQuestionTypes ??
            getTrainingSettings({
              ...settings,
              difficulty: result.rules.difficulty,
              generations: result.rules.generations,
              questionSelection: 'automatic',
            }).questionTypes;
          return (
            automatic.length === result.rules.questionTypes.length &&
            automatic.every((type) =>
              result.rules!.questionTypes.includes(type),
            )
          );
        })()
      : isLeagueTraining(settings));
  const earnedQuickAttack =
    isLeagueRound && result.correctCount >= 8 && result.elapsedSeconds < 60;
  return {
    championAnswersWithoutClues,
    correctCategories,
    correctGenerations,
    correctPokemon: [...correctPokemon],
    correctQuestionTypes,
    masteryRounds: progress.masteryRounds + Number(isLeagueRound && isPerfect),
    quickAttackRounds: progress.quickAttackRounds + Number(earnedQuickAttack),
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
  ...results.progress,
  pokedex,
  bestDailyStreak: getLongestStreak(results.streak.creditedDates),
  leagueCompleted: results.league.completed,
});

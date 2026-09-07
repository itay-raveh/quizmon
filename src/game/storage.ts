import {
  readPlayerData,
  updatePlayerData,
  canPersistPlayerData,
} from './player-storage';
import type { SavedResults } from './results-data';
import {
  defaultModifiers,
  isLeagueTraining,
  TRAINING_QUESTION_COUNT,
} from './game';
import { getLocalDate } from './daily';
import { isLeagueVictory } from './league';
import { createRoundSeed } from './random';
import {
  type GameMode,
  type GameResult,
  type Generation,
  type Modifiers,
  type QuestionCategory,
  type QuestionType,
} from './types';

export interface TrainerStats {
  bestDailyStreak: number;
  championAnswersWithoutClues: number;
  correctCategories: Partial<Record<QuestionCategory, number>>;
  correctGenerations: Partial<Record<Generation, number>>;
  correctPokemon: string[];
  correctQuestionTypes: Partial<Record<QuestionType, number>>;
  leagueCompleted: boolean;
  masteryRounds: number;
  quickAttackCompleted: boolean;
}

const addResultToProgress = (
  progress: SavedResults['progress'],
  result: GameResult,
  mode: GameMode,
  modifiers: Modifiers,
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
    correctPokemon.add(answer.pokemonName);
    correctGenerations[answer.generation] =
      (correctGenerations[answer.generation] ?? 0) + 1;
    if (answer.questionType === 'champion') {
      championAnswersWithoutClues += Number(answer.cluesUsed === 0);
    } else {
      correctQuestionTypes[answer.questionType] =
        (correctQuestionTypes[answer.questionType] ?? 0) + 1;
    }
  }

  const isPerfect = result.correctCount === result.questionCount;
  const isLeagueRound =
    mode.kind === 'training' &&
    result.questionCount === TRAINING_QUESTION_COUNT &&
    isLeagueTraining(modifiers);

  return {
    championAnswersWithoutClues,
    correctCategories,
    correctGenerations,
    correctPokemon: [...correctPokemon],
    correctQuestionTypes,
    masteryRounds: progress.masteryRounds + Number(isLeagueRound && isPerfect),
    quickAttackCompleted:
      progress.quickAttackCompleted ||
      (isLeagueRound && result.correctCount >= 8 && result.elapsedSeconds < 60),
    version: 2,
  };
};

export const getHighScoreKey = (
  mode: GameMode,
  modifiers: Pick<Modifiers, 'trainingMode'>,
): 'daily' | 'league' | 'custom' | null =>
  mode.kind === 'daily'
    ? 'daily'
    : mode.kind === 'training'
      ? modifiers.trainingMode
      : null;

const isBetterResult = (candidate: GameResult, previous: GameResult): boolean =>
  candidate.score > previous.score ||
  (candidate.score === previous.score &&
    getResultDuration(candidate) < getResultDuration(previous));

const getResultDuration = (result: GameResult): number =>
  result.elapsedMilliseconds ?? (result.elapsedSeconds + 1) * 1_000 - 1;

const getBestResult = (
  results: readonly GameResult[],
): GameResult | undefined =>
  results.reduce<GameResult | undefined>(
    (best, result) => (!best || isBetterResult(result, best) ? result : best),
    undefined,
  );

const readResults = (): SavedResults => readPlayerData().results;

const writeResults = (results: SavedResults): boolean =>
  updatePlayerData({ results });

export const canPersistResults = canPersistPlayerData;

export const readDailyResult = (date: string): GameResult | null =>
  readResults().daily[date] ?? null;

export const readCompletedDailyCount = (): number =>
  Object.keys(readResults().daily).length;

const previousDailyDate = (date: string): string => {
  const previous = new Date(`${date}T00:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
};

export const readDailyStreak = (today = getLocalDate()): number => {
  const creditedDates = new Set(readResults().streak.creditedDates);
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

export const readTrainerStats = (): TrainerStats => {
  const results = readResults();
  return {
    bestDailyStreak: getLongestStreak(results.streak.creditedDates),
    championAnswersWithoutClues: results.progress.championAnswersWithoutClues,
    correctCategories: results.progress.correctCategories,
    correctGenerations: results.progress.correctGenerations,
    correctPokemon: results.progress.correctPokemon,
    correctQuestionTypes: results.progress.correctQuestionTypes,
    leagueCompleted: results.league.completed,
    masteryRounds: results.progress.masteryRounds,
    quickAttackCompleted: results.progress.quickAttackCompleted,
  };
};

export const getLeagueChallengeSeed = (): string => {
  const results = readResults();
  if (results.league.seed) return results.league.seed;

  const seed = createRoundSeed();
  results.league.seed = seed;
  writeResults(results);
  return seed;
};

export const saveResult = (
  mode: GameMode,
  result: GameResult,
  modifiers: Modifiers = defaultModifiers,
): { best: GameResult; isNewBest: boolean; isSaved: boolean } => {
  const results = readResults();
  if (mode.kind === 'daily') {
    const previous = results.daily[mode.date];
    if (previous) {
      return { best: previous, isNewBest: false, isSaved: true };
    }
    const previousBest = getBestResult(Object.values(results.daily));
    const isNewBest = !previousBest || isBetterResult(result, previousBest);
    results.daily[mode.date] = result;
    results.progress = addResultToProgress(
      results.progress,
      result,
      mode,
      modifiers,
    );
    if (
      mode.date === getLocalDate() &&
      !results.streak.creditedDates.includes(mode.date)
    ) {
      results.streak.creditedDates.push(mode.date);
      results.streak.creditedDates.sort();
    }
    const isSaved = writeResults(results);
    return {
      best: isNewBest ? result : previousBest,
      isNewBest: isNewBest && isSaved,
      isSaved,
    };
  }

  if (mode.kind === 'league') {
    results.progress = addResultToProgress(
      results.progress,
      result,
      mode,
      modifiers,
    );
    const completed = isLeagueVictory(result);
    results.league.completed = results.league.completed || completed;
    if (completed) results.league.seed = null;
    const isSaved = writeResults(results);
    return {
      best: result,
      isNewBest: completed && isSaved,
      isSaved,
    };
  }

  const key = modifiers.trainingMode;
  const previous = results.training[key];
  const isNewBest = !previous || isBetterResult(result, previous);
  results.progress = addResultToProgress(
    results.progress,
    result,
    mode,
    modifiers,
  );
  if (isNewBest) results.training[key] = result;
  const isSaved = writeResults(results);
  return {
    best: isNewBest ? result : previous,
    isNewBest: isNewBest && isSaved,
    isSaved,
  };
};

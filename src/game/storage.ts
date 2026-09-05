import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
  writeStoredValue,
} from './browser-storage';
import {
  defaultModifiers,
  isLeagueTraining,
  TRAINING_QUESTION_COUNT,
} from './game';
import { getUtcDate, parseDailyDate } from './daily';
import { isLeagueVictory } from './league';
import { questionTypes } from './questions/registry';
import { createRoundSeed } from './random';
import {
  generations,
  questionCategories,
  type GameMode,
  type GameResult,
  type Generation,
  type Modifiers,
  type QuestionCategory,
  type QuestionType,
} from './types';
import { isFiniteNonnegative, isRecord } from './validation';

const RESULTS_KEY = 'quizmon.results.v2';
const STREAK_VERSION = 1;
const TRAINER_PROGRESS_VERSION = 2;
interface TrainerProgress {
  championAnswersWithoutClues: number;
  correctCategories: Partial<Record<QuestionCategory, number>>;
  correctGenerations: Partial<Record<Generation, number>>;
  correctPokemon: string[];
  correctQuestionTypes: Partial<Record<QuestionType, number>>;
  masteryRounds: number;
  quickAttackCompleted: boolean;
  version: number;
}

interface DailyStreakState {
  creditedDates: string[];
  version: number;
}

interface LeagueState {
  completed: boolean;
  seed: string | null;
}

type HighScoreKey = 'daily' | 'league' | 'custom';
type TrainingHighScoreKey = Exclude<HighScoreKey, 'daily'>;

interface SavedResults {
  daily: Record<string, GameResult>;
  league: LeagueState;
  progress: TrainerProgress;
  streak: DailyStreakState;
  training: Partial<Record<TrainingHighScoreKey, GameResult>>;
}

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

const emptyProgress = (): TrainerProgress => ({
  championAnswersWithoutClues: 0,
  correctCategories: {},
  correctGenerations: {},
  correctPokemon: [],
  correctQuestionTypes: {},
  masteryRounds: 0,
  quickAttackCompleted: false,
  version: TRAINER_PROGRESS_VERSION,
});

const emptyResults = (): SavedResults => ({
  daily: {},
  league: { completed: false, seed: null },
  progress: emptyProgress(),
  streak: { creditedDates: [], version: STREAK_VERSION },
  training: {},
});

const normalizeLeague = (value: unknown): LeagueState => {
  if (!isRecord(value)) {
    return { completed: false, seed: null };
  }

  const league = value as Partial<LeagueState>;
  return {
    completed: league.completed === true,
    seed:
      typeof league.seed === 'string' &&
      league.seed.length > 0 &&
      league.seed.length <= 200
        ? league.seed
        : null,
  };
};

const readResultRecord = (value: unknown): Record<string, GameResult> =>
  isRecord(value) ? (value as Record<string, GameResult>) : {};

const normalizeStreak = (
  streak: Partial<DailyStreakState> | undefined,
  daily: Record<string, GameResult>,
): DailyStreakState => {
  const creditedDates =
    streak?.version === STREAK_VERSION && Array.isArray(streak.creditedDates)
      ? streak.creditedDates
      : [];

  return {
    creditedDates: [
      ...new Set(
        creditedDates.filter(
          (date) =>
            typeof date === 'string' &&
            parseDailyDate(`?daily=${date}`) === date &&
            daily[date],
        ),
      ),
    ].sort(),
    version: STREAK_VERSION,
  };
};

const addResultToProgress = (
  progress: TrainerProgress,
  result: GameResult,
  mode: GameMode,
  modifiers: Modifiers,
): TrainerProgress => {
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
    version: TRAINER_PROGRESS_VERSION,
  };
};

const normalizeCounts = <Key extends string>(
  value: unknown,
  allowedKeys: readonly Key[],
): Partial<Record<Key, number>> =>
  isRecord(value)
    ? (Object.fromEntries(
        Object.entries(value).filter(
          ([key, count]) =>
            allowedKeys.includes(key as Key) && isFiniteNonnegative(count),
        ),
      ) as Partial<Record<Key, number>>)
    : {};

const normalizeProgress = (
  progress: Partial<TrainerProgress> | undefined,
): TrainerProgress => {
  if (
    progress?.version !== TRAINER_PROGRESS_VERSION ||
    !Array.isArray(progress.correctPokemon) ||
    typeof progress.quickAttackCompleted !== 'boolean' ||
    !isRecord(progress.correctCategories)
  ) {
    return emptyProgress();
  }

  return {
    championAnswersWithoutClues: isFiniteNonnegative(
      progress.championAnswersWithoutClues,
    )
      ? Math.max(0, Math.trunc(progress.championAnswersWithoutClues))
      : 0,
    correctCategories: normalizeCounts(
      progress.correctCategories,
      questionCategories,
    ),
    correctGenerations: normalizeCounts(
      progress.correctGenerations,
      generations,
    ),
    correctPokemon: [
      ...new Set(
        progress.correctPokemon.filter(
          (name) => typeof name === 'string' && name.length > 0,
        ),
      ),
    ],
    correctQuestionTypes: normalizeCounts(
      progress.correctQuestionTypes,
      questionTypes,
    ),
    masteryRounds: isFiniteNonnegative(progress.masteryRounds)
      ? Math.max(0, Math.trunc(progress.masteryRounds))
      : 0,
    quickAttackCompleted: progress.quickAttackCompleted,
    version: TRAINER_PROGRESS_VERSION,
  };
};

export const getHighScoreKey = (
  mode: GameMode,
  modifiers: Pick<Modifiers, 'trainingMode'>,
): HighScoreKey | null =>
  mode.kind === 'daily'
    ? 'daily'
    : mode.kind === 'training'
      ? modifiers.trainingMode
      : null;

const isBetterResult = (candidate: GameResult, previous: GameResult): boolean =>
  candidate.score > previous.score ||
  (candidate.score === previous.score &&
    candidate.elapsedSeconds < previous.elapsedSeconds);

const getBestResult = (
  results: readonly GameResult[],
): GameResult | undefined =>
  results.reduce<GameResult | undefined>(
    (best, result) => (!best || isBetterResult(result, best) ? result : best),
    undefined,
  );

const normalizeTrainingRecords = (value: unknown): SavedResults['training'] => {
  const records = readResultRecord(value);
  return {
    ...(records.custom ? { custom: records.custom } : {}),
    ...(records.league ? { league: records.league } : {}),
  };
};

const readResults = (): SavedResults => {
  const value = readStoredJson('localStorage', RESULTS_KEY);
  if (!isRecord(value)) {
    return emptyResults();
  }

  const parsed = value as Partial<SavedResults>;
  const daily = readResultRecord(parsed.daily);
  const training = normalizeTrainingRecords(parsed.training);
  return {
    daily,
    league: normalizeLeague(parsed.league),
    progress: normalizeProgress(parsed.progress),
    streak: normalizeStreak(parsed.streak, daily),
    training,
  };
};

const writeResults = (results: SavedResults): boolean =>
  writeStoredJson('localStorage', RESULTS_KEY, results);

export const canPersistResults = (): boolean => {
  const probeKey = `${RESULTS_KEY}.probe`;
  return (
    writeStoredValue('localStorage', probeKey, '1') &&
    removeStoredValue('localStorage', probeKey)
  );
};

export const readDailyResult = (date: string): GameResult | null =>
  readResults().daily[date] ?? null;

const previousUtcDate = (date: string): string => {
  const previous = new Date(`${date}T00:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return getUtcDate(previous);
};

export const readDailyStreak = (today = getUtcDate()): number => {
  const creditedDates = new Set(readResults().streak.creditedDates);
  let date = creditedDates.has(today) ? today : previousUtcDate(today);
  let streak = 0;

  while (creditedDates.has(date)) {
    streak += 1;
    date = previousUtcDate(date);
  }

  return streak;
};

const getLongestStreak = (dates: readonly string[]): number => {
  let longest = 0;
  let current = 0;
  let previous: string | undefined;

  for (const date of [...new Set(dates)].sort()) {
    current = previous && previousUtcDate(date) === previous ? current + 1 : 1;
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
      mode.date === getUtcDate() &&
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

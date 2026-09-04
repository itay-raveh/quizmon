import { defaultModifiers } from './game';
import { getUtcDate, parseDailyDate } from './daily';
import { questionTypes } from './questions/registry';
import {
  generations,
  type GameMode,
  type GameResult,
  type Generation,
  type Modifiers,
  type QuestionCategory,
  type QuestionType,
} from './types';

const RESULTS_KEY = 'quizmon.results.v2';
const STREAK_VERSION = 1;
const TRAINER_PROGRESS_VERSION = 1;
const TRAINING_RECORD_VERSION = 2;
const SPECIALTY_MIN_ANSWERS = 10;
const questionCategories: readonly QuestionCategory[] = [
  'ability',
  'champion',
  'description',
  'evolution',
  'identity',
  'matchup',
  'move',
  'stat',
  'type',
];

interface CategoryProgress {
  correct: number;
  total: number;
}

interface TrainerProgress {
  categories: Partial<Record<QuestionCategory, CategoryProgress>>;
  championAnswersWithoutClues: number;
  correctGenerations: Partial<Record<Generation, number>>;
  correctQuestionTypes: Partial<Record<QuestionType, number>>;
  gamesCompleted: number;
  masteryRounds: number;
  perfectRounds: number;
  version: number;
}

interface DailyStreakState {
  creditedDates: string[];
  version: number;
}

interface SavedResults {
  daily: Record<string, GameResult>;
  progress: TrainerProgress;
  streak: DailyStreakState;
  training: Record<string, GameResult>;
}

export interface TrainerStats {
  bestDailyStreak: number;
  categories: Partial<Record<QuestionCategory, CategoryProgress>>;
  championAnswersWithoutClues: number;
  correctGenerations: Partial<Record<Generation, number>>;
  correctQuestionTypes: Partial<Record<QuestionType, number>>;
  dailyChallengesCompleted: number;
  gamesCompleted: number;
  masteryRounds: number;
  perfectRounds: number;
  specialty: (CategoryProgress & { category: QuestionCategory }) | null;
}

const emptyProgress = (): TrainerProgress => ({
  categories: {},
  championAnswersWithoutClues: 0,
  correctGenerations: {},
  correctQuestionTypes: {},
  gamesCompleted: 0,
  masteryRounds: 0,
  perfectRounds: 0,
  version: TRAINER_PROGRESS_VERSION,
});

const emptyResults = (): SavedResults => ({
  daily: {},
  progress: emptyProgress(),
  streak: { creditedDates: [], version: STREAK_VERSION },
  training: {},
});

const readResultRecord = (value: unknown): Record<string, GameResult> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, GameResult>)
    : {};

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
): TrainerProgress => {
  const categories = { ...progress.categories };
  const correctGenerations = { ...progress.correctGenerations };
  const correctQuestionTypes = { ...progress.correctQuestionTypes };
  let championAnswersWithoutClues = progress.championAnswersWithoutClues;

  for (const answer of result.answers) {
    const current = categories[answer.category] ?? { correct: 0, total: 0 };
    categories[answer.category] = {
      correct: current.correct + Number(answer.correct),
      total: current.total + 1,
    };

    if (!answer.correct) continue;

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

  return {
    categories,
    championAnswersWithoutClues,
    correctGenerations,
    correctQuestionTypes,
    gamesCompleted: progress.gamesCompleted + 1,
    masteryRounds:
      progress.masteryRounds +
      Number(
        mode.kind === 'training' && result.questionCount >= 10 && isPerfect,
      ),
    perfectRounds: progress.perfectRounds + Number(isPerfect),
    version: TRAINER_PROGRESS_VERSION,
  };
};

const normalizeCounts = <Key extends string>(
  value: unknown,
  allowedKeys: readonly Key[],
): Partial<Record<Key, number>> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (Object.fromEntries(
        Object.entries(value).filter(
          ([key, count]) =>
            allowedKeys.includes(key as Key) &&
            typeof count === 'number' &&
            Number.isFinite(count) &&
            count >= 0,
        ),
      ) as Partial<Record<Key, number>>)
    : {};

const normalizeProgress = (
  progress: Partial<TrainerProgress> | undefined,
): TrainerProgress => {
  if (
    progress?.version !== TRAINER_PROGRESS_VERSION ||
    typeof progress.gamesCompleted !== 'number' ||
    !Number.isFinite(progress.gamesCompleted) ||
    typeof progress.perfectRounds !== 'number' ||
    !Number.isFinite(progress.perfectRounds) ||
    !progress.categories ||
    typeof progress.categories !== 'object'
  ) {
    return emptyProgress();
  }

  const categories = Object.fromEntries(
    Object.entries(progress.categories).filter(
      ([category, value]) =>
        questionCategories.includes(category as QuestionCategory) &&
        value &&
        Number.isFinite(value.correct) &&
        Number.isFinite(value.total) &&
        value.correct >= 0 &&
        value.total >= value.correct,
    ),
  ) as TrainerProgress['categories'];

  return {
    categories,
    championAnswersWithoutClues:
      typeof progress.championAnswersWithoutClues === 'number' &&
      Number.isFinite(progress.championAnswersWithoutClues)
        ? Math.max(0, Math.trunc(progress.championAnswersWithoutClues))
        : 0,
    correctGenerations: normalizeCounts(
      progress.correctGenerations,
      generations,
    ),
    correctQuestionTypes: normalizeCounts(
      progress.correctQuestionTypes,
      questionTypes,
    ),
    gamesCompleted: Math.max(0, Math.trunc(progress.gamesCompleted)),
    masteryRounds:
      typeof progress.masteryRounds === 'number' &&
      Number.isFinite(progress.masteryRounds)
        ? Math.max(0, Math.trunc(progress.masteryRounds))
        : 0,
    perfectRounds: Math.max(0, Math.trunc(progress.perfectRounds)),
    version: TRAINER_PROGRESS_VERSION,
  };
};

export const getTrainingRecordKey = (
  modifiers: Modifiers,
  questionCount: number,
): string => {
  const selectedGenerations = generations.filter((generation) =>
    modifiers.generations.includes(generation),
  );
  const selectedQuestionTypes = questionTypes.filter((questionType) =>
    modifiers.questionTypes.includes(questionType),
  );

  return JSON.stringify({
    generations: selectedGenerations,
    questionCount,
    questionTypes: selectedQuestionTypes,
    version: TRAINING_RECORD_VERSION,
  });
};

const isBetterResult = (candidate: GameResult, previous: GameResult): boolean =>
  candidate.score > previous.score ||
  (candidate.score === previous.score &&
    candidate.elapsedSeconds < previous.elapsedSeconds);

const readResults = (): SavedResults => {
  try {
    const stored = window.localStorage.getItem(RESULTS_KEY);
    if (!stored) return emptyResults();
    const parsed = JSON.parse(stored) as Partial<SavedResults>;
    const daily = readResultRecord(parsed.daily);
    const training = readResultRecord(parsed.training);
    return {
      daily,
      progress: normalizeProgress(parsed.progress),
      streak: normalizeStreak(parsed.streak, daily),
      training,
    };
  } catch {
    return emptyResults();
  }
};

const writeResults = (results: SavedResults): boolean => {
  try {
    window.localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
    return true;
  } catch {
    return false;
  }
};

export const canPersistResults = (): boolean => {
  const probeKey = `${RESULTS_KEY}.probe`;
  try {
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
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
  const specialty =
    Object.entries(results.progress.categories)
      .map(([category, progress]) => ({
        category: category as QuestionCategory,
        correct: progress?.correct ?? 0,
        total: progress?.total ?? 0,
      }))
      .filter(({ total }) => total >= SPECIALTY_MIN_ANSWERS)
      .sort(
        (left, right) =>
          right.correct / right.total - left.correct / left.total ||
          right.total - left.total ||
          left.category.localeCompare(right.category),
      )[0] ?? null;

  return {
    bestDailyStreak: getLongestStreak(results.streak.creditedDates),
    categories: results.progress.categories,
    championAnswersWithoutClues: results.progress.championAnswersWithoutClues,
    correctGenerations: results.progress.correctGenerations,
    correctQuestionTypes: results.progress.correctQuestionTypes,
    dailyChallengesCompleted: Object.keys(results.daily).length,
    gamesCompleted: results.progress.gamesCompleted,
    masteryRounds: results.progress.masteryRounds,
    perfectRounds: results.progress.perfectRounds,
    specialty,
  };
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
    results.daily[mode.date] = result;
    results.progress = addResultToProgress(results.progress, result, mode);
    if (
      mode.date === getUtcDate() &&
      !results.streak.creditedDates.includes(mode.date)
    ) {
      results.streak.creditedDates.push(mode.date);
      results.streak.creditedDates.sort();
    }
    const isSaved = writeResults(results);
    return {
      best: result,
      isNewBest: isSaved,
      isSaved,
    };
  }

  const key = getTrainingRecordKey(modifiers, result.questionCount);
  const previous = results.training[key];
  const isNewBest = !previous || isBetterResult(result, previous);
  results.progress = addResultToProgress(results.progress, result, mode);
  if (isNewBest) results.training[key] = result;
  const isSaved = writeResults(results);
  return {
    best: isNewBest ? result : previous,
    isNewBest: isNewBest && isSaved,
    isSaved,
  };
};

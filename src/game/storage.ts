import { useState } from 'react';
import {
  calculateScore,
  defaultModifiers,
  getSpeedBonusPoints,
  normalizeModifiers,
  SCORE_VERSION,
} from './game';
import { getUtcDate, parseDailyDate } from './daily';
import { questionTypes } from './questions/registry';
import {
  generations,
  type GameMode,
  type GameResult,
  type Modifiers,
  type QuestionCategory,
} from './types';

const SETTINGS_KEY = 'quizmon.training-settings.v2';
const RESULTS_KEY = 'quizmon.results.v2';
const GENERATION_PROMPT_KEY = 'quizmon.generation-prompt.v1';
const TRAINER_PROFILE_KEY = 'quizmon.trainer-profile.v1';
const LEGACY_KNOWLEDGE_SCALE = 10;
const LEGACY_SPEED_BONUS_SCALE = 120;
const STREAK_VERSION = 1;
const TRAINER_PROGRESS_VERSION = 1;
const TRAINER_PROFILE_VERSION = 1;
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

export interface CategoryProgress {
  correct: number;
  total: number;
}

interface TrainerProgress {
  categories: Partial<Record<QuestionCategory, CategoryProgress>>;
  gamesCompleted: number;
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
  dailyChallengesCompleted: number;
  gamesCompleted: number;
  perfectRounds: number;
  specialty: (CategoryProgress & { category: QuestionCategory }) | null;
}

export const trainerAccents = ['cobalt', 'leaf', 'ember', 'violet'] as const;
export type TrainerAccent = (typeof trainerAccents)[number];

export interface TrainerProfile {
  accent: TrainerAccent;
  cardNumber: string;
  createdAt: string;
  hasBeenRevealed: boolean;
  name: string;
  partnerPokemon: string | null;
  version: number;
}

const emptyProgress = (): TrainerProgress => ({
  categories: {},
  gamesCompleted: 0,
  perfectRounds: 0,
  version: TRAINER_PROGRESS_VERSION,
});

const emptyResults = (): SavedResults => ({
  daily: {},
  progress: emptyProgress(),
  streak: { creditedDates: [], version: STREAK_VERSION },
  training: {},
});

const migrateLegacyAnswer = (answer: GameResult['answers'][number]) => {
  const points = answer.points * LEGACY_KNOWLEDGE_SCALE;
  const speedBonus =
    answer.responseMilliseconds === undefined
      ? Math.round((answer.speedBonus ?? 0) * LEGACY_SPEED_BONUS_SCALE)
      : getSpeedBonusPoints(points, answer.responseMilliseconds);
  return { ...answer, points, speedBonus };
};

const normalizeResult = (result: GameResult): GameResult => {
  if (!Array.isArray(result.answers)) return result;

  const answers =
    result.scoreVersion === SCORE_VERSION
      ? result.answers
      : result.answers.map(migrateLegacyAnswer);
  return {
    ...result,
    answers,
    score: calculateScore(answers),
    scoreVersion: SCORE_VERSION,
  };
};

const normalizeResultRecord = (
  results: Record<string, GameResult> | undefined,
): Record<string, GameResult> =>
  Object.fromEntries(
    Object.entries(results ?? {}).map(([key, result]) => [
      key,
      normalizeResult(result),
    ]),
  );

const normalizeStreak = (
  streak: Partial<DailyStreakState> | undefined,
  daily: Record<string, GameResult>,
): DailyStreakState => {
  const creditedDates =
    streak?.version === STREAK_VERSION && Array.isArray(streak.creditedDates)
      ? streak.creditedDates
      : Object.keys(daily);

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
): TrainerProgress => {
  const categories = { ...progress.categories };
  for (const answer of result.answers) {
    const current = categories[answer.category] ?? { correct: 0, total: 0 };
    categories[answer.category] = {
      correct: current.correct + Number(answer.correct),
      total: current.total + 1,
    };
  }

  return {
    categories,
    gamesCompleted: progress.gamesCompleted + 1,
    perfectRounds:
      progress.perfectRounds +
      Number(result.correctCount === result.questionCount),
    version: TRAINER_PROGRESS_VERSION,
  };
};

const deriveProgress = (
  daily: Record<string, GameResult>,
  training: Record<string, GameResult>,
): TrainerProgress =>
  [...Object.values(daily), ...Object.values(training)].reduce(
    addResultToProgress,
    emptyProgress(),
  );

const normalizeProgress = (
  progress: Partial<TrainerProgress> | undefined,
  daily: Record<string, GameResult>,
  training: Record<string, GameResult>,
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
    return deriveProgress(daily, training);
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
    gamesCompleted: Math.max(0, Math.trunc(progress.gamesCompleted)),
    perfectRounds: Math.max(0, Math.trunc(progress.perfectRounds)),
    version: TRAINER_PROGRESS_VERSION,
  };
};

const readModifiers = (): Modifiers => {
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    return stored ? normalizeModifiers(JSON.parse(stored)) : defaultModifiers;
  } catch {
    return defaultModifiers;
  }
};

export const usePersistentModifiers = () => {
  const [modifiers, setModifiersState] = useState<Modifiers>(readModifiers);

  const setModifiers = (nextModifiers: Modifiers) => {
    const normalized = normalizeModifiers(nextModifiers);
    setModifiersState(normalized);

    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    } catch {
      // The game still works when storage is unavailable.
    }
  };

  return [modifiers, setModifiers] as const;
};

export const shouldShowGenerationPrompt = (): boolean => {
  try {
    return (
      !window.localStorage.getItem(SETTINGS_KEY) &&
      !window.localStorage.getItem(GENERATION_PROMPT_KEY)
    );
  } catch {
    return true;
  }
};

export const markGenerationPromptAnswered = () => {
  try {
    window.localStorage.setItem(GENERATION_PROMPT_KEY, '1');
  } catch {
    return;
  }
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
    const daily = normalizeResultRecord(parsed.daily);
    const training = normalizeResultRecord(parsed.training);
    return {
      daily,
      progress: normalizeProgress(parsed.progress, daily, training),
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
    dailyChallengesCompleted: Object.keys(results.daily).length,
    gamesCompleted: results.progress.gamesCompleted,
    perfectRounds: results.progress.perfectRounds,
    specialty,
  };
};

const createCardNumber = (): string => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return `QZ-${String((values[0] ?? 0) % 1_000_000).padStart(6, '0')}`;
};

const createTrainerProfile = (): TrainerProfile => ({
  accent: 'cobalt',
  cardNumber: createCardNumber(),
  createdAt: getUtcDate(),
  hasBeenRevealed: false,
  name: '',
  partnerPokemon: null,
  version: TRAINER_PROFILE_VERSION,
});

const normalizeTrainerProfile = (value: unknown): TrainerProfile | null => {
  if (!value || typeof value !== 'object') return null;
  const profile = value as Partial<TrainerProfile>;
  if (
    profile.version !== TRAINER_PROFILE_VERSION ||
    typeof profile.cardNumber !== 'string' ||
    !/^QZ-\d{6}$/.test(profile.cardNumber) ||
    typeof profile.createdAt !== 'string' ||
    parseDailyDate(`?daily=${profile.createdAt}`) !== profile.createdAt ||
    typeof profile.hasBeenRevealed !== 'boolean' ||
    typeof profile.name !== 'string' ||
    (profile.partnerPokemon !== null &&
      typeof profile.partnerPokemon !== 'string')
  ) {
    return null;
  }

  return {
    accent: trainerAccents.includes(profile.accent as TrainerAccent)
      ? (profile.accent as TrainerAccent)
      : 'cobalt',
    cardNumber: profile.cardNumber,
    createdAt: profile.createdAt,
    hasBeenRevealed: profile.hasBeenRevealed,
    name: profile.name.trim().slice(0, 20),
    partnerPokemon: profile.partnerPokemon,
    version: TRAINER_PROFILE_VERSION,
  };
};

export const readTrainerProfile = (): TrainerProfile => {
  try {
    const stored = window.localStorage.getItem(TRAINER_PROFILE_KEY);
    const profile = stored ? normalizeTrainerProfile(JSON.parse(stored)) : null;
    if (profile) return profile;
  } catch {
    return createTrainerProfile();
  }

  const profile = createTrainerProfile();
  try {
    window.localStorage.setItem(TRAINER_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    return profile;
  }
  return profile;
};

export const saveTrainerProfile = (profile: TrainerProfile): TrainerProfile => {
  const normalized = normalizeTrainerProfile(profile) ?? readTrainerProfile();
  try {
    window.localStorage.setItem(
      TRAINER_PROFILE_KEY,
      JSON.stringify(normalized),
    );
  } catch {
    return normalized;
  }
  return normalized;
};

export const requestPersistentStorage = async (): Promise<boolean> => {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  return navigator.storage.persist();
};

export const saveResult = (
  mode: GameMode,
  result: GameResult,
  modifiers: Modifiers = defaultModifiers,
): { best: GameResult; isNewBest: boolean; isSaved: boolean } => {
  const results = readResults();
  const normalizedResult = normalizeResult(result);

  if (mode.kind === 'daily') {
    const previous = results.daily[mode.date];
    if (previous) {
      return { best: previous, isNewBest: false, isSaved: true };
    }
    results.daily[mode.date] = normalizedResult;
    results.progress = addResultToProgress(results.progress, normalizedResult);
    if (
      mode.date === getUtcDate() &&
      !results.streak.creditedDates.includes(mode.date)
    ) {
      results.streak.creditedDates.push(mode.date);
      results.streak.creditedDates.sort();
    }
    const isSaved = writeResults(results);
    return {
      best: normalizedResult,
      isNewBest: isSaved,
      isSaved,
    };
  }

  const key = getTrainingRecordKey(modifiers, normalizedResult.questionCount);
  const previous = results.training[key];
  const isNewBest = !previous || isBetterResult(normalizedResult, previous);
  results.progress = addResultToProgress(results.progress, normalizedResult);
  if (isNewBest) results.training[key] = normalizedResult;
  const isSaved = writeResults(results);
  return {
    best: isNewBest ? normalizedResult : previous,
    isNewBest: isNewBest && isSaved,
    isSaved,
  };
};

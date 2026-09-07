import { isDailyDate } from './daily';
import { questionTypes } from './questions/registry';
import {
  generations,
  questionCategories,
  type GameResult,
  type Generation,
  type QuestionCategory,
  type QuestionType,
  type TrainingMode,
} from './types';
import { isChoice, isFiniteNonnegative, isRecord } from './validation';

export const STREAK_VERSION = 1;
export const TRAINER_PROGRESS_VERSION = 2;
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

export interface SavedResults {
  daily: Record<string, GameResult>;
  league: LeagueState;
  progress: TrainerProgress;
  streak: DailyStreakState;
  training: Partial<Record<TrainingMode, GameResult>>;
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

  return {
    completed: value.completed === true,
    seed:
      typeof value.seed === 'string' &&
      value.seed.length > 0 &&
      value.seed.length <= 200
        ? value.seed
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
        creditedDates.filter((date) => isDailyDate(date) && daily[date]),
      ),
    ].sort(),
    version: STREAK_VERSION,
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
            isChoice(key, allowedKeys) && isFiniteNonnegative(count),
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

const normalizeTrainingRecords = (value: unknown): SavedResults['training'] => {
  const records = readResultRecord(value);
  return {
    ...(records.custom ? { custom: records.custom } : {}),
    ...(records.league ? { league: records.league } : {}),
  };
};

export const normalizeResults = (value: unknown): SavedResults => {
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

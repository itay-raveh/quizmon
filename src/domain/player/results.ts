import { getUnifiedScoreKey } from '../quiz/scoring.ts';
import {
  isChoice,
  isDailyDate,
  isFiniteNonnegative,
  isRecord,
} from '../../lib/validation.ts';
import { generations, type Generation } from '../pokemon/types.ts';
import { hasDailyResultOnDate } from '../quiz/daily-track.ts';
import { questionTypes } from '../quiz/questions/definitions.ts';
import {
  questionCategories,
  type SavedAnswerResult,
  type GameResult,
} from '../quiz/types.ts';

interface TrainerProgress {
  championAnswersWithoutClues: number;
  correctCategories: Partial<Record<SavedAnswerResult['category'], number>>;
  correctGenerations: Partial<Record<Generation, number>>;
  correctPokemon: string[];
  correctQuestionTypes: Partial<
    Record<NonNullable<SavedAnswerResult['questionType']>, number>
  >;
  masteryRounds: number;
  quickAttackCompleted: boolean;
  quickAttackRounds: number;
}

interface DailyStreakState {
  creditedDates: string[];
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
  training: Partial<Record<`score:${number}`, GameResult>>;
}

const emptyProgress = (): TrainerProgress => ({
  championAnswersWithoutClues: 0,
  correctCategories: {},
  correctGenerations: {},
  correctPokemon: [],
  correctQuestionTypes: {},
  masteryRounds: 0,
  quickAttackCompleted: false,
  quickAttackRounds: 0,
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
  const creditedDates = Array.isArray(streak?.creditedDates)
    ? streak.creditedDates
    : [];

  return {
    creditedDates: [
      ...new Set(
        creditedDates.filter(
          (date) => isDailyDate(date) && hasDailyResultOnDate(daily, date),
        ),
      ),
    ].sort(),
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

const normalizeProgressCount = (value: unknown): number =>
  isFiniteNonnegative(value) ? Math.max(0, Math.trunc(value)) : 0;

const normalizeProgress = (
  progress: Partial<TrainerProgress> | undefined,
): TrainerProgress => {
  if (
    !progress ||
    !Array.isArray(progress.correctPokemon) ||
    typeof progress.quickAttackCompleted !== 'boolean' ||
    !isRecord(progress.correctCategories)
  ) {
    return emptyProgress();
  }

  return {
    championAnswersWithoutClues: normalizeProgressCount(
      progress.championAnswersWithoutClues,
    ),
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
    correctQuestionTypes: normalizeCounts(progress.correctQuestionTypes, [
      ...questionTypes,
      'champion',
    ]),
    masteryRounds: normalizeProgressCount(progress.masteryRounds),
    quickAttackCompleted: progress.quickAttackCompleted,
    quickAttackRounds: normalizeProgressCount(progress.quickAttackRounds),
  };
};

const normalizeTrainingRecords = (value: unknown): SavedResults['training'] => {
  const records = readResultRecord(value);
  return Object.fromEntries(
    Object.entries(records).filter(
      ([key, result]) => getUnifiedScoreKey(result) === key,
    ),
  );
};

export const normalizeResults = (value: unknown): SavedResults => {
  const parsed = (isRecord(value) ? value : {}) as Partial<SavedResults>;
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

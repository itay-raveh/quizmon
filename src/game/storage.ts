import { useState } from 'react';
import {
  calculateScore,
  defaultModifiers,
  getSpeedBonusPoints,
  normalizeModifiers,
  SCORE_VERSION,
} from './game';
import { getUtcDate, parseDailyDate } from './daily';
import type { GameMode, GameResult, Modifiers } from './types';

const SETTINGS_KEY = 'quizmon.training-settings.v2';
const RESULTS_KEY = 'quizmon.results.v2';
const GENERATION_PROMPT_KEY = 'quizmon.generation-prompt.v1';
const LEGACY_KNOWLEDGE_SCALE = 10;
const LEGACY_SPEED_BONUS_SCALE = 120;
const STREAK_VERSION = 1;

interface DailyStreakState {
  creditedDates: string[];
  version: number;
}

interface SavedResults {
  daily: Record<string, GameResult>;
  streak: DailyStreakState;
  training: Record<string, GameResult>;
}

const emptyResults = (): SavedResults => ({
  daily: {},
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

const getTrainingKey = (questionCount: number): string =>
  `questions:${questionCount}`;

const isBetterResult = (candidate: GameResult, previous: GameResult): boolean =>
  candidate.score > previous.score ||
  (candidate.score === previous.score &&
    candidate.elapsedSeconds < previous.elapsedSeconds);

const getTrainingBest = (
  results: Record<string, GameResult>,
  questionCount: number,
): GameResult | undefined =>
  Object.values(results)
    .filter(
      (result) =>
        result.questionCount === questionCount && Array.isArray(result.answers),
    )
    .reduce<GameResult | undefined>(
      (best, result) => (!best || isBetterResult(result, best) ? result : best),
      undefined,
    );

const readResults = (): SavedResults => {
  try {
    const stored = window.localStorage.getItem(RESULTS_KEY);
    if (!stored) return emptyResults();
    const parsed = JSON.parse(stored) as Partial<SavedResults>;
    const daily = normalizeResultRecord(parsed.daily);
    return {
      daily,
      streak: normalizeStreak(parsed.streak, daily),
      training: normalizeResultRecord(parsed.training),
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

export const saveResult = (
  mode: GameMode,
  result: GameResult,
): { best: GameResult; isNewBest: boolean; isSaved: boolean } => {
  const results = readResults();
  const normalizedResult = normalizeResult(result);

  if (mode.kind === 'daily') {
    const previous = results.daily[mode.date];
    if (previous) {
      return { best: previous, isNewBest: false, isSaved: true };
    }
    results.daily[mode.date] = normalizedResult;
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

  const key = getTrainingKey(normalizedResult.questionCount);
  const previous = getTrainingBest(
    results.training,
    normalizedResult.questionCount,
  );
  const isNewBest = !previous || isBetterResult(normalizedResult, previous);

  if (!isNewBest) {
    return { best: previous, isNewBest, isSaved: true };
  }

  results.training[key] = normalizedResult;
  const isSaved = writeResults(results);
  return {
    best: normalizedResult,
    isNewBest: isSaved,
    isSaved,
  };
};

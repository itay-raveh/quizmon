import { useState } from 'react';
import { defaultModifiers, normalizeModifiers } from './game';
import type { GameMode, GameResult, Modifiers } from './types';

const SETTINGS_KEY = 'quizmon.training-settings.v2';
const RESULTS_KEY = 'quizmon.results.v2';

interface SavedResults {
  daily: Record<string, GameResult>;
  training: Record<string, GameResult>;
}

const emptyResults = (): SavedResults => ({ daily: {}, training: {} });

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

const getTrainingKey = (modifiers: Modifiers): string =>
  JSON.stringify({
    generations: [...modifiers.generations].sort(),
    isLimitActive: modifiers.isLimitActive,
    knowledgeCategories: [...modifiers.knowledgeCategories].sort(),
    limit: modifiers.isLimitActive ? modifiers.limit : null,
    speedrunMode: modifiers.speedrunMode,
  });

const readResults = (): SavedResults => {
  try {
    const stored = window.localStorage.getItem(RESULTS_KEY);
    if (!stored) return emptyResults();
    const parsed = JSON.parse(stored) as Partial<SavedResults>;
    return {
      daily: parsed.daily ?? {},
      training: parsed.training ?? {},
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

export const readDailyResult = (date: string): GameResult | null =>
  readResults().daily[date] ?? null;

export const saveResult = (
  mode: GameMode,
  modifiers: Modifiers,
  result: GameResult,
): { best: GameResult; isNewBest: boolean } => {
  const results = readResults();

  if (mode.kind === 'daily') {
    const previous = results.daily[mode.date];
    if (previous) return { best: previous, isNewBest: false };
    results.daily[mode.date] = result;
    return {
      best: result,
      isNewBest: writeResults(results),
    };
  }

  const key = getTrainingKey(modifiers);
  const previous = results.training[key];
  const isNewBest =
    !previous ||
    result.score > previous.score ||
    (result.score === previous.score &&
      result.elapsedSeconds < previous.elapsedSeconds);

  if (!isNewBest) return { best: previous, isNewBest };

  results.training[key] = result;
  return {
    best: result,
    isNewBest: writeResults(results),
  };
};

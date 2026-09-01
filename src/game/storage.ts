import { useState } from 'react';
import { defaultModifiers, normalizeModifiers } from './game';
import type { GameMode, GameResult, Modifiers } from './types';

const STORAGE_KEY = 'modifiers';
const BEST_SCORES_KEY = 'quizmon.best-scores.v1';

const readModifiers = (): Modifiers => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // The game still works when storage is unavailable.
    }
  };

  return [modifiers, setModifiers] as const;
};

const getModeKey = (mode: GameMode, modifiers: Modifiers): string => {
  if (mode.kind === 'daily') return `daily:${mode.date}`;

  return JSON.stringify({
    formCategories: [...modifiers.formCategories].sort(),
    generations: [...modifiers.generations].sort(),
    isLimitActive: modifiers.isLimitActive,
    limit: modifiers.isLimitActive ? modifiers.limit : null,
    randomSprite: modifiers.randomSprite,
    speedrunMode: modifiers.speedrunMode,
    whosThatPokemon: modifiers.whosThatPokemon,
  });
};

const readBestScores = (): Record<string, GameResult> => {
  try {
    const stored = window.localStorage.getItem(BEST_SCORES_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, GameResult>)
      : {};
  } catch {
    return {};
  }
};

export const saveBestScore = (
  mode: GameMode,
  modifiers: Modifiers,
  result: GameResult,
): { best: GameResult; isNewBest: boolean } => {
  const scores = readBestScores();
  const key = getModeKey(mode, modifiers);
  const previous = scores[key];
  const isNewBest =
    !previous ||
    result.score > previous.score ||
    (result.score === previous.score &&
      result.elapsedSeconds < previous.elapsedSeconds);

  if (!isNewBest) return { best: previous, isNewBest };

  scores[key] = result;
  try {
    window.localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(scores));
  } catch {
    return { best: result, isNewBest: false };
  }
  return { best: result, isNewBest };
};

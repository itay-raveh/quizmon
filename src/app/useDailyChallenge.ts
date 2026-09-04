import { useCallback, useEffect, useState } from 'react';
import {
  buildDailyQuestions,
  getDailyModifiers,
  getUtcDate,
  parseDailyDate,
  shouldAutoStartDaily,
} from '@/game/daily';
import {
  canPersistResults,
  readDailyResult,
  readDailyStreak,
} from '@/game/storage';
import type {
  GameMode,
  GameResult,
  Modifiers,
  PokemonCatalog,
  QuestionData,
} from '@/game/types';
import { parseTrainerRoute } from './trainer-route';

interface DailyChallengeOptions {
  catalog?: PokemonCatalog;
  modifiers: Modifiers;
  refreshSavedData: () => void;
  startGame: (
    questions: QuestionData[],
    modifiers: Modifiers,
    mode: GameMode,
    seed: string,
  ) => void;
}

const getDailyRoute = () => {
  const search = window.location.search;
  const linkedDate = parseDailyDate(search);
  return {
    autoStart: !parseTrainerRoute(search) && shouldAutoStartDaily(search),
    date: linkedDate ?? getUtcDate(),
    linkedDate,
  };
};

export const useDailyChallenge = ({
  catalog,
  modifiers,
  refreshSavedData,
  startGame,
}: DailyChallengeOptions) => {
  const [route] = useState(getDailyRoute);
  const [result, setResult] = useState<GameResult | null>(() =>
    readDailyResult(route.date),
  );
  const [resultSaved, setResultSaved] = useState(() => Boolean(result));
  const [streak, setStreak] = useState(readDailyStreak);
  const [storageAvailable] = useState(canPersistResults);

  const refresh = useCallback(() => {
    const saved = readDailyResult(route.date);
    if (saved) {
      setResult(saved);
      setResultSaved(true);
    }
    setStreak(readDailyStreak());
    refreshSavedData();
  }, [refreshSavedData, route.date]);

  useEffect(() => {
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const start = useCallback(() => {
    if (!catalog || result || !storageAvailable) return;

    const saved = readDailyResult(route.date);
    if (saved) {
      setResult(saved);
      setResultSaved(true);
      return;
    }

    startGame(
      buildDailyQuestions(catalog, route.date),
      getDailyModifiers(modifiers),
      { kind: 'daily', date: route.date },
      `daily:${route.date}`,
    );
  }, [catalog, modifiers, result, route.date, startGame, storageAvailable]);

  const recordCompletion = useCallback(
    (savedResult: GameResult, isSaved: boolean) => {
      setResult(savedResult);
      setResultSaved(isSaved);
      if (isSaved) setStreak(readDailyStreak());
    },
    [],
  );

  return {
    autoStart: route.autoStart,
    date: route.date,
    linkedDate: route.linkedDate,
    recordCompletion,
    result,
    resultSaved,
    start,
    storageAvailable,
    streak,
  };
};

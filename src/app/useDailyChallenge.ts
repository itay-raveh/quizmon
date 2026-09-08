import { useCallback, useEffect, useState } from 'react';
import {
  buildDailyQuestions,
  getDailyModifiers,
  getLocalDate,
  parseDailyDate,
  shouldAutoStartDaily,
} from '@/game/daily';
import {
  canPersistResults,
  getDailyStreak,
  readDailyResult,
  readDailyStreak,
} from '@/game/storage';
import type { GameResult, Modifiers, PokemonCatalog } from '@/game/types';
import { readPlayerData } from '@/game/player-storage';
import type { StartGame } from './session';
import { parseTrainerRoute } from './trainer-route';

interface DailyChallengeOptions {
  catalog?: PokemonCatalog;
  modifiers: Modifiers;
  refreshSavedData: () => void;
  startGame: StartGame;
}

const getDailyRoute = () => {
  const search = window.location.search;
  const linkedDate = parseDailyDate(search);
  return {
    autoStart: !parseTrainerRoute(search) && shouldAutoStartDaily(search),
    date: linkedDate ?? getLocalDate(),
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
  const [{ result, resultSaved }, setCompletion] = useState(() => {
    const result = readDailyResult(route.date);
    return { result, resultSaved: Boolean(result) };
  });
  const [streak, setStreak] = useState(readDailyStreak);
  const [storageAvailable] = useState(canPersistResults);

  const refresh = useCallback(() => {
    const data = readPlayerData();
    const saved = data.results.daily[route.date];
    if (saved) {
      setCompletion({ result: saved, resultSaved: true });
    }
    setStreak(
      getDailyStreak(data.results.streak.creditedDates, getLocalDate()),
    );
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
      setCompletion({ result: saved, resultSaved: true });
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
    (result: GameResult, resultSaved: boolean) => {
      setCompletion({ result, resultSaved });
      if (resultSaved) setStreak(readDailyStreak());
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

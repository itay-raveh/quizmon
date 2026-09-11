import type { StartGame } from '@/app/game-session';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import {
  getDailySettings,
  getLocalDate,
  parseDailyDate,
  shouldAutoStartDaily,
} from '@/domain/quiz/daily';
import { buildDailyQuestions } from '@/domain/quiz/question-generation';
import type { GameResult } from '@/domain/quiz/types';
import type { GameSettings } from '@/domain/settings/types';
import { parseTrainerRoute } from '@/features/trainer/trainer-route';
import { readPlayerData } from '@/lib/storage/player-storage';
import { useCallback, useEffect, useState } from 'react';
import { getDailyStreak } from '../../domain/player/progress';
import {
  canPersistResults,
  readDailyResult,
  readDailyStreak,
} from '../../lib/storage/results-storage';

interface DailyChallengeOptions {
  catalog?: PokemonCatalog;
  settings: GameSettings;
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
  settings,
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
      getDailySettings(settings),
      { kind: 'daily', date: route.date },
      `daily:${route.date}`,
    );
  }, [catalog, settings, result, route.date, startGame, storageAvailable]);

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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import type { StartGame } from '../../app/game-session';
import { getDailyStreak } from '../../domain/player/progress';
import {
  formGroups,
  generations,
  type PokemonCatalog,
} from '../../domain/pokemon/types';
import {
  getUtcDate,
  parseDailyDate,
  shouldAutoStartDaily,
} from '../../domain/quiz/daily';
import {
  buildDailyQuestions,
  resolveTrainingSettings,
} from '../../domain/quiz/question-generation';
import type { GameResult } from '../../domain/quiz/types';
import type { GameSettings } from '../../domain/settings/types';
import { type ActiveGameSnapshot } from '../../lib/storage/active-game-storage';
import { subscribeToPlayerChanges } from '../../lib/storage/player-storage';
import { canPersistResults } from '../../lib/storage/results-storage';
import { readDailyState } from './daily-state';

interface DailyChallengeOptions {
  catalog?: PokemonCatalog;
  settings: GameSettings;
  refreshSavedData: () => void;
  startGame: StartGame;
  resume: (snapshot: ActiveGameSnapshot) => void;
}

export const useDailyChallenge = ({
  catalog,
  settings,
  refreshSavedData,
  startGame,
  resume,
}: DailyChallengeOptions) => {
  const location = useLocation();
  const route = useMemo(() => {
    return {
      autoStart: shouldAutoStartDaily(location.pathname, location.search),
      date: parseDailyDate(location.pathname),
    };
  }, [location.pathname, location.search]);
  const [today, setToday] = useState(getUtcDate);
  const date = route.date ?? today;
  const [error, setError] = useState('');
  const [completion, setCompletion] = useState<{
    date: string;
    result: GameResult | null;
    resultSaved: boolean;
  }>({ date, result: null, resultSaved: false });
  const [snapshot, setSnapshot] = useState(() => ({
    date,
    data: readDailyState(date),
  }));
  const savedState = useMemo(
    () => (snapshot.date === date ? snapshot.data : readDailyState(date)),
    [date, snapshot],
  );
  const streak = getDailyStreak(savedState.results.streak.creditedDates, today);
  const [storageAvailable, setStorageAvailable] = useState(canPersistResults);
  const refresh = useCallback(() => {
    const currentDate = getUtcDate();
    const nextDate = route.date ?? currentDate;
    const next = readDailyState(nextDate);
    setSnapshot({ date: nextDate, data: next });
    setCompletion((current) => {
      if (nextDate !== current.date)
        return { date: nextDate, result: null, resultSaved: false };
      const saved = next.results.daily[nextDate];
      return saved
        ? { date: nextDate, result: saved, resultSaved: true }
        : { ...current };
    });
    setToday(currentDate);
    refreshSavedData();
  }, [route.date, refreshSavedData]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (getUtcDate() !== today) refresh();
    }, 30_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    const unsubscribe = subscribeToPlayerChanges(refresh);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh, today]);

  const choose = async () => {
    setError('');
    const currentDate = getUtcDate();
    const selectedDate = route.date ?? currentDate;
    setToday(currentDate);
    const saved = readDailyState(selectedDate);
    setSnapshot({ date: selectedDate, data: saved });
    if (saved.readError) return;
    const key = selectedDate;
    const exactResult = saved.results.daily[key];
    const exactAttempt = saved.attempts[key];
    const result = exactResult;
    if (result) {
      setCompletion({ date: selectedDate, result, resultSaved: true });
      return;
    }
    if (!catalog || !canPersistResults()) return;
    const attempt = exactAttempt;
    if (attempt) {
      resume(attempt);
      return;
    }
    try {
      const next = resolveTrainingSettings(catalog, {
        ...settings,
        difficulty: 3,
        generations: [...generations],
        formGroups: [...formGroups],
        questionSelection: 'automatic',
      });
      const seed = `daily:${selectedDate}`;
      const questions = buildDailyQuestions(catalog, selectedDate, next);
      const started = await startGame(
        questions,
        next,
        { kind: 'daily', date: selectedDate },
        seed,
      );
      if (started === false)
        setError(
          'Your browser could not save this attempt. Free some storage and try again.',
        );
    } catch {
      setError('This challenge could not be prepared. Please try again.');
    }
  };
  const start = () => {
    setStorageAvailable(canPersistResults());
    refresh();
    return choose();
  };
  const recordCompletion = useCallback(
    (result: GameResult, completedDate: string) => {
      const currentDate = getUtcDate();
      setCompletion({ date: completedDate, result, resultSaved: true });
      setToday(currentDate);
      const date = route.date ?? currentDate;
      setSnapshot({ date, data: readDailyState(date) });
    },
    [route.date],
  );
  const savedResult = savedState.results.daily[date];
  return {
    autoStart: route.autoStart,
    linkedDate: route.date,
    date,
    result:
      savedResult ?? (completion.date === date ? completion.result : null),
    resultSaved:
      Boolean(savedResult) ||
      (completion.date === date && completion.resultSaved),
    error: savedState.readError
      ? 'Saved results could not be read. Open Settings, then Backup to restore a valid backup.'
      : error,
    start,
    recordCompletion,
    storageAvailable,
    streak,
  };
};

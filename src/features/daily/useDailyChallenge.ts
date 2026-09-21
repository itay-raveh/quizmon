import { useCallback, useEffect, useState } from 'react';
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
  currentDailyTrack,
  getDailyResultKey,
  isDailyTrack,
  type DailyTrack,
} from '../../domain/quiz/daily-track';
import {
  buildDailyTrackQuestions,
  resolveTrainingSettings,
} from '../../domain/quiz/question-generation';
import type { GameResult } from '../../domain/quiz/types';
import type { GameSettings } from '../../domain/settings/types';
import { type ActiveGameSnapshot } from '../../lib/storage/active-game-storage';
import { subscribeToPlayerChanges } from '../../lib/storage/player-storage';
import { canPersistResults } from '../../lib/storage/results-storage';
import { parseTrainerRoute } from '../trainer/trainer-route';
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
  const [route] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const candidate = {
      difficulty: Number(params.get('level')),
      scope: params.get('scope'),
    };
    return {
      autoStart:
        !params.has('screen') &&
        !new URLSearchParams(window.location.hash.slice(1)).has('friend') &&
        !parseTrainerRoute(window.location.search) &&
        shouldAutoStartDaily(window.location.search),
      date: parseDailyDate(window.location.search),
      track: isDailyTrack(candidate) ? candidate : undefined,
    };
  });
  const [today, setToday] = useState(getUtcDate);
  const date = route.date ?? today;
  const [error, setError] = useState('');
  const [completion, setCompletion] = useState<{
    date: string;
    result: GameResult | null;
    resultSaved: boolean;
  }>({ date, result: null, resultSaved: false });
  const [savedState, setSavedState] = useState(() => readDailyState(date));
  const streak = getDailyStreak(savedState.results.streak.creditedDates, today);
  const [storageAvailable, setStorageAvailable] = useState(canPersistResults);
  const refresh = useCallback(() => {
    const currentDate = getUtcDate();
    const nextDate = route.date ?? currentDate;
    const next = readDailyState(nextDate);
    setSavedState(next);
    setCompletion((current) => {
      if (nextDate !== current.date)
        return { date: nextDate, result: null, resultSaved: false };
      const saved =
        next.results.daily[
          getDailyResultKey(nextDate, current.result?.dailyTrack)
        ];
      return saved
        ? { date: nextDate, result: saved, resultSaved: true }
        : { ...current };
    });
    setToday(currentDate);
    refreshSavedData();
  }, [route.date, refreshSavedData]);
  useEffect(() => {
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    const unsubscribe = subscribeToPlayerChanges(refresh);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const choose = async (
    track: DailyTrack = route.track ?? currentDailyTrack,
  ) => {
    setError('');
    const currentDate = getUtcDate();
    const selectedDate = route.date ?? currentDate;
    setToday(currentDate);
    const saved = readDailyState(selectedDate);
    setSavedState(saved);
    if (saved.readError) return;
    const key = getDailyResultKey(selectedDate, track);
    const exactResult = saved.results.daily[key];
    const exactAttempt = saved.attempts[key];
    const result =
      exactResult ?? (exactAttempt ? undefined : saved.completed[0]);
    if (result) {
      setCompletion({ date: selectedDate, result, resultSaved: true });
      return;
    }
    if (!catalog || !canPersistResults()) return;
    const attempt = exactAttempt ?? Object.values(saved.attempts)[0];
    if (attempt) {
      resume(attempt);
      return;
    }
    if (
      track.difficulty !== currentDailyTrack.difficulty ||
      track.scope !== currentDailyTrack.scope
    ) {
      setError(
        'This challenge is no longer available. Your saved attempts and results are unchanged.',
      );
      return;
    }
    try {
      const next = resolveTrainingSettings(catalog, {
        ...settings,
        difficulty: track.difficulty,
        generations: track.scope === 'gen-i' ? ['I'] : [...generations],
        formGroups: [...formGroups],
        questionSelection: 'automatic',
      });
      const seed = `daily:${selectedDate}:${track.difficulty}:${track.scope}`;
      const questions = buildDailyTrackQuestions(
        catalog,
        selectedDate,
        next,
        track.scope,
      );
      const started = await startGame(
        questions,
        next,
        { kind: 'daily', date: selectedDate, track },
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
    (result: GameResult, saved: boolean, completedDate: string) => {
      const currentDate = getUtcDate();
      setCompletion({ date: completedDate, result, resultSaved: saved });
      setToday(currentDate);
      setSavedState(readDailyState(route.date ?? currentDate));
    },
    [route.date],
  );
  const requestedKey = getDailyResultKey(date, route.track);
  const savedResult =
    savedState.results.daily[requestedKey] ??
    (savedState.attempts[requestedKey] ? undefined : savedState.completed[0]);
  return {
    savedState,
    autoStart: route.autoStart,
    linkedDate: route.date,
    date,
    choose,
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

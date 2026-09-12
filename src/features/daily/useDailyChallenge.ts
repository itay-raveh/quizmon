import { readDailyState } from './daily-state';
import { getDailyStreak } from '@/domain/player/progress';
import {
  currentDailyTrack,
  getDailyResultKey,
} from '@/domain/quiz/daily-track';
import type { StartGame } from '@/app/game-session';
import {
  formGroups,
  generations,
  type PokemonCatalog,
} from '@/domain/pokemon/types';
import { parseTrainerRoute } from '@/features/trainer/trainer-route';
import {
  getLocalDate,
  parseDailyDate,
  shouldAutoStartDaily,
} from '@/domain/quiz/daily';
import { isDailyTrack, type DailyTrack } from '@/domain/quiz/daily-track';
import { QUESTION_RULES_VERSION } from '@/domain/quiz/question-variants';
import {
  buildDailyTrackQuestions,
  resolveTrainingSettings,
} from '@/domain/quiz/question-generation';
import type { GameResult } from '@/domain/quiz/types';
import type { GameSettings } from '@/domain/settings/types';
import { type ActiveGameSnapshot } from '@/lib/storage/active-game-storage';
import { useCallback, useEffect, useState } from 'react';
import { canPersistResults } from '@/lib/storage/results-storage';

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
        !parseTrainerRoute(window.location.search) &&
        shouldAutoStartDaily(window.location.search),
      date: parseDailyDate(window.location.search),
      track: isDailyTrack(candidate) ? candidate : undefined,
      rules: params.get('rules'),
      catalog: params.get('catalog'),
    };
  });
  const [today, setToday] = useState(getLocalDate);
  const date = route.date ?? today;
  const [error, setError] = useState('');
  const [completion, setCompletion] = useState<{
    result: GameResult | null;
    resultSaved: boolean;
  }>({ result: null, resultSaved: false });
  const [savedState, setSavedState] = useState(() => readDailyState(date));
  const streak = getDailyStreak(savedState.results.streak.creditedDates, today);
  const [storageAvailable, setStorageAvailable] = useState(canPersistResults);
  const refresh = useCallback(() => {
    const nextDate = route.date ?? getLocalDate();
    const next = readDailyState(nextDate);
    setSavedState(next);
    setCompletion((current) => {
      if (nextDate !== date) return { result: null, resultSaved: false };
      const saved =
        next.results.daily[getDailyResultKey(date, current.result?.dailyTrack)];
      return saved ? { result: saved, resultSaved: true } : { ...current };
    });
    setToday(getLocalDate());
    refreshSavedData();
  }, [date, route.date, refreshSavedData]);
  useEffect(() => {
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const choose = (track: DailyTrack = route.track ?? currentDailyTrack) => {
    setError('');
    const saved = readDailyState(date);
    setSavedState(saved);
    if (saved.readError) return;
    const key = getDailyResultKey(date, track);
    const exactResult = saved.results.daily[key];
    const exactAttempt = saved.attempts[key];
    const result =
      exactResult ?? (exactAttempt ? undefined : saved.completed[0]);
    if (result) {
      setCompletion({ result, resultSaved: true });
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
    if (
      route.track &&
      track.difficulty === route.track.difficulty &&
      track.scope === route.track.scope &&
      ((route.rules !== null &&
        route.rules !== String(QUESTION_RULES_VERSION)) ||
        (route.catalog !== null &&
          route.catalog !== String(catalog.contentVersion)))
    ) {
      setError(
        'This challenge version is no longer available. Your saved attempts and results are unchanged.',
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
      const seed = `daily:${date}:${track.difficulty}:${track.scope}`;
      const questions = buildDailyTrackQuestions(
        catalog,
        date,
        next,
        track.scope,
      );
      const started = startGame(
        questions,
        next,
        { kind: 'daily', date, track },
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
    choose();
  };
  const recordCompletion = useCallback(
    (result: GameResult, saved: boolean) => {
      setCompletion({ result, resultSaved: saved });
      setSavedState(readDailyState(date));
    },
    [date],
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
    result: savedResult ?? completion.result,
    resultSaved: Boolean(savedResult) || completion.resultSaved,
    error: savedState.readError
      ? 'Saved results could not be read. Open Settings, then Backup to restore a valid backup.'
      : error,
    start,
    recordCompletion,
    storageAvailable,
    streak,
  };
};

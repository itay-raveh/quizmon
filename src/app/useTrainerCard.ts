import { useCallback, useEffect, useState } from 'react';
import { readTrainerStats } from '@/game/storage';
import {
  readTrainerProfile,
  saveTrainerProfile,
  type TrainerProfile,
} from '@/game/trainer-profile';
import type { TrainerView } from '@/game/trainer';
import { isRecord } from '@/game/validation';
import { parseTrainerRoute, setTrainerRoute } from './trainer-route';

export const useTrainerCard = () => {
  const [view, setView] = useState<TrainerView | null>(() =>
    parseTrainerRoute(window.location.search),
  );
  const [profile, setProfile] = useState(readTrainerProfile);
  const [stats, setStats] = useState(readTrainerStats);

  useEffect(() => {
    const syncRoute = () => setView(parseTrainerRoute(window.location.search));
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const open = useCallback((nextView: TrainerView) => {
    const url = new URL(window.location.href);
    setTrainerRoute(url, nextView);
    window.history.pushState({ quizmonTrainerCard: true }, '', url);
    setView(nextView);
  }, []);

  const showView = useCallback((nextView: TrainerView) => {
    const url = new URL(window.location.href);
    setTrainerRoute(url, nextView);
    window.history.replaceState(window.history.state, '', url);
    setView(nextView);
  }, []);

  const close = useCallback(() => {
    const historyState: unknown = window.history.state;
    if (isRecord(historyState) && historyState.quizmonTrainerCard === true) {
      window.history.back();
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('trainer');
    window.history.replaceState(window.history.state, '', url);
    setView(null);
  }, []);

  const updateProfile = useCallback((nextProfile: TrainerProfile) => {
    setProfile(saveTrainerProfile(nextProfile));
  }, []);

  const refresh = useCallback(() => {
    setProfile(readTrainerProfile());
    setStats(readTrainerStats());
  }, []);

  const refreshStats = useCallback(() => {
    setStats(readTrainerStats());
  }, []);

  return {
    close,
    isOpen: view !== null,
    open,
    profile,
    refresh,
    refreshStats,
    showView,
    stats,
    updateProfile,
    view: view ?? 'front',
  };
};

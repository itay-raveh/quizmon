import { useCallback, useEffect, useState } from 'react';
import type { TrainerView } from '../../domain/player/trainer-progression';
import { subscribeToPlayerChanges } from '../../lib/storage/player-storage';
import { readTrainerStats } from '../../lib/storage/results-storage';
import {
  readTrainerProfile,
  saveTrainerProfile,
  type TrainerProfile,
} from '../../lib/storage/trainer-profile-storage';
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

  const showView = useCallback((nextView: TrainerView) => {
    const url = new URL(window.location.href);
    setTrainerRoute(url, nextView);
    window.history.replaceState(window.history.state, '', url);
    setView(nextView);
  }, []);

  const updateProfile = useCallback(async (nextProfile: TrainerProfile) => {
    setProfile(await saveTrainerProfile(nextProfile));
  }, []);

  const refresh = useCallback(() => {
    setProfile(readTrainerProfile());
    setStats(readTrainerStats());
  }, []);

  useEffect(() => subscribeToPlayerChanges(refresh), [refresh]);

  const refreshStats = useCallback(() => {
    setStats(readTrainerStats());
  }, []);

  return {
    isOpen: view !== null,
    profile,
    refresh,
    refreshStats,
    showView,
    stats,
    updateProfile,
    view: view ?? 'front',
  };
};

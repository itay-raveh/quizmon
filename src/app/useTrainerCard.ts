import { useCallback, useEffect, useState } from 'react';
import { readTrainerStats } from '@/game/storage';
import {
  readTrainerProfile,
  saveTrainerProfile,
  type TrainerProfile,
} from '@/game/trainer-profile';
import type { TrainerCardFace } from '@/game/trainer';
import { isRecord } from '@/game/validation';
import { parseTrainerRoute, setTrainerRoute } from './trainer-route';

export const useTrainerCard = () => {
  const [face, setFace] = useState<TrainerCardFace | null>(() =>
    parseTrainerRoute(window.location.search),
  );
  const [profile, setProfile] = useState(readTrainerProfile);
  const [stats, setStats] = useState(readTrainerStats);

  useEffect(() => {
    const syncRoute = () => setFace(parseTrainerRoute(window.location.search));
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const open = useCallback((nextFace: TrainerCardFace) => {
    const url = new URL(window.location.href);
    setTrainerRoute(url, nextFace);
    window.history.pushState({ quizmonTrainerCard: true }, '', url);
    setFace(nextFace);
  }, []);

  const showFace = useCallback((nextFace: TrainerCardFace) => {
    const url = new URL(window.location.href);
    setTrainerRoute(url, nextFace);
    window.history.replaceState(window.history.state, '', url);
    setFace(nextFace);
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
    setFace(null);
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
    face: face ?? 'front',
    isOpen: face !== null,
    open,
    profile,
    refresh,
    refreshStats,
    showFace,
    stats,
    updateProfile,
  };
};

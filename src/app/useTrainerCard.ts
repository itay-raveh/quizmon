import { useCallback, useEffect, useState } from 'react';
import { readTrainerStats } from '@/game/storage';
import {
  readTrainerProfile,
  saveTrainerProfile,
  type TrainerProfile,
} from '@/game/trainer-profile';

const hasTrainerRoute = () =>
  new URLSearchParams(window.location.search).has('trainer');

export const useTrainerCard = () => {
  const [isOpen, setIsOpen] = useState(hasTrainerRoute);
  const [profile, setProfile] = useState(readTrainerProfile);
  const [stats, setStats] = useState(readTrainerStats);

  useEffect(() => {
    const syncRoute = () => setIsOpen(hasTrainerRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const open = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('trainer', '1');
    window.history.pushState({ quizmonTrainerCard: true }, '', url);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    const historyState: unknown = window.history.state;
    if (
      historyState !== null &&
      typeof historyState === 'object' &&
      'quizmonTrainerCard' in historyState &&
      historyState.quizmonTrainerCard === true
    ) {
      window.history.back();
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('trainer');
    window.history.replaceState(window.history.state, '', url);
    setIsOpen(false);
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
    isOpen,
    open,
    profile,
    refresh,
    refreshStats,
    stats,
    updateProfile,
  };
};

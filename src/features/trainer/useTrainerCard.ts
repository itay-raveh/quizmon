import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { subscribeToPlayerChanges } from '../../lib/storage/player-storage';
import { readTrainerStats } from '../../lib/storage/results-storage';
import {
  readTrainerProfile,
  saveTrainerProfile,
  type TrainerProfile,
} from '../../lib/storage/trainer-profile-storage';
import { parseTrainerRoute } from './trainer-route';

export const useTrainerCard = () => {
  const location = useLocation();
  const view = parseTrainerRoute(location.pathname);
  const [profile, setProfile] = useState(readTrainerProfile);
  const [stats, setStats] = useState(readTrainerStats);

  const updateProfile = useCallback(async (nextProfile: TrainerProfile) => {
    const saved = await saveTrainerProfile(nextProfile);
    if (saved) setProfile(readTrainerProfile());
    return saved;
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
    stats,
    updateProfile,
    view: view ?? 'front',
  };
};

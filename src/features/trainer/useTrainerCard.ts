import { useCallback, useEffect, useState } from 'react';
import { subscribeToPlayerChanges } from '../../lib/storage/player-storage';
import { readTrainerStats } from '../../lib/storage/results-storage';
import {
  readTrainerProfile,
  saveTrainerProfile,
  type TrainerProfile,
} from '../../lib/storage/trainer-profile-storage';

export const useTrainerCard = () => {
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
    profile,
    refresh,
    refreshStats,
    stats,
    updateProfile,
  };
};

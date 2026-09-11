import {
  createTrainerProfile,
  normalizeTrainerProfile,
  type TrainerProfile,
} from '../../domain/player/trainer-profile';
import { readPlayerData, updatePlayerData } from './player-storage';
export type { TrainerProfile } from '../../domain/player/trainer-profile';

export const readTrainerProfile = (): TrainerProfile => {
  const profile = readPlayerData().profile;
  if (profile) return profile;
  const created = createTrainerProfile();
  updatePlayerData({ profile: created });
  return created;
};

export const saveTrainerProfile = (profile: TrainerProfile): TrainerProfile => {
  const normalized = normalizeTrainerProfile(profile) ?? readTrainerProfile();
  updatePlayerData({ profile: normalized });
  return normalized;
};

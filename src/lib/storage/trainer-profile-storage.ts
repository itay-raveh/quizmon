export type { TrainerProfile } from '../../domain/player/trainer-profile';
import {
  createTrainerProfile,
  normalizeTrainerProfile,
  type TrainerProfile,
} from '../../domain/player/trainer-profile';
import { readPlayerData, updatePlayerData } from './player-storage';

export const readTrainerProfile = (): TrainerProfile => {
  return readPlayerData().profile ?? createTrainerProfile();
};

export const saveTrainerProfile = async (
  profile: TrainerProfile,
): Promise<boolean> => {
  const normalized = normalizeTrainerProfile(profile);
  return normalized ? updatePlayerData({ profile: normalized }) : false;
};

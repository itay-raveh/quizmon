export type { TrainerProfile } from '../../domain/player/trainer-profile';
import {
  createTrainerProfile,
  trainerProfileSchema,
  type TrainerProfile,
} from '../../domain/player/trainer-profile';
import { readPlayerData, updatePlayerData } from './player-storage';

export const readTrainerProfile = (): TrainerProfile => {
  return readPlayerData().profile ?? createTrainerProfile();
};

export const saveTrainerProfile = async (
  profile: TrainerProfile,
): Promise<boolean> => {
  const parsed = trainerProfileSchema.safeParse(profile);
  return parsed.success ? updatePlayerData({ profile: parsed.data }) : false;
};

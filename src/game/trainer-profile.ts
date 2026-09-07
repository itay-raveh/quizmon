import { readPlayerData, updatePlayerData } from './player-storage';
import {
  createTrainerProfile,
  normalizeTrainerProfile,
  type TrainerProfile,
} from './profile-data';
export type { TrainerProfile } from './profile-data';

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

export const requestPersistentStorage = async (): Promise<boolean> => {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  return navigator.storage.persist();
};

import { readStoredJson, writeStoredJson } from './browser-storage';
import { getUtcDate, parseDailyDate } from './daily';
import { trainerSpecialtyLabels, type TrainerSpecialty } from './trainer';
import { isRecord } from './validation';

const TRAINER_PROFILE_KEY = 'quizmon.trainer-profile.v1';
const TRAINER_PROFILE_VERSION = 1;

export interface TrainerProfile {
  createdAt: string;
  hasBeenRevealed: boolean;
  name: string;
  partnerPokemon: string | null;
  specialty: TrainerSpecialty | null;
  version: number;
}

const createTrainerProfile = (): TrainerProfile => ({
  createdAt: getUtcDate(),
  hasBeenRevealed: false,
  name: '',
  partnerPokemon: null,
  specialty: null,
  version: TRAINER_PROFILE_VERSION,
});

const normalizeTrainerProfile = (value: unknown): TrainerProfile | null => {
  if (!isRecord(value)) return null;
  const profile = value as Partial<TrainerProfile>;
  if (
    profile.version !== TRAINER_PROFILE_VERSION ||
    typeof profile.createdAt !== 'string' ||
    parseDailyDate(`?daily=${profile.createdAt}`) !== profile.createdAt ||
    typeof profile.hasBeenRevealed !== 'boolean' ||
    typeof profile.name !== 'string' ||
    (profile.partnerPokemon !== null &&
      typeof profile.partnerPokemon !== 'string') ||
    (profile.specialty !== null &&
      !Object.hasOwn(trainerSpecialtyLabels, profile.specialty ?? ''))
  ) {
    return null;
  }

  return {
    createdAt: profile.createdAt,
    hasBeenRevealed: profile.hasBeenRevealed,
    name: profile.name.trim().slice(0, 20),
    partnerPokemon: profile.partnerPokemon,
    specialty: profile.specialty as TrainerSpecialty | null,
    version: TRAINER_PROFILE_VERSION,
  };
};

export const readTrainerProfile = (): TrainerProfile => {
  const stored = readStoredJson('localStorage', TRAINER_PROFILE_KEY);
  const profile = normalizeTrainerProfile(stored);
  if (profile) {
    if (isRecord(stored) && Object.hasOwn(stored, 'cardNumber')) {
      writeStoredJson('localStorage', TRAINER_PROFILE_KEY, profile);
    }
    return profile;
  }

  const created = createTrainerProfile();
  writeStoredJson('localStorage', TRAINER_PROFILE_KEY, created);
  return created;
};

export const saveTrainerProfile = (profile: TrainerProfile): TrainerProfile => {
  const normalized = normalizeTrainerProfile(profile) ?? readTrainerProfile();
  writeStoredJson('localStorage', TRAINER_PROFILE_KEY, normalized);
  return normalized;
};

export const requestPersistentStorage = async (): Promise<boolean> => {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  return navigator.storage.persist();
};

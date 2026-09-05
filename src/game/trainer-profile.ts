import { readStoredJson, writeStoredJson } from './browser-storage';
import { getUtcDate, parseDailyDate } from './daily';
import { trainerSpecialtyLabels, type TrainerSpecialty } from './trainer';

const TRAINER_PROFILE_KEY = 'quizmon.trainer-profile.v1';
const TRAINER_PROFILE_VERSION = 1;

export const trainerAccents = ['cobalt', 'leaf', 'ember', 'violet'] as const;
export type TrainerAccent = (typeof trainerAccents)[number];

export interface TrainerProfile {
  accent: TrainerAccent;
  cardNumber: string;
  createdAt: string;
  hasBeenRevealed: boolean;
  name: string;
  partnerPokemon: string | null;
  specialty: TrainerSpecialty | null;
  version: number;
}

const createCardNumber = (): string => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return `QZ-${String((values[0] ?? 0) % 1_000_000).padStart(6, '0')}`;
};

const createTrainerProfile = (): TrainerProfile => ({
  accent: 'cobalt',
  cardNumber: createCardNumber(),
  createdAt: getUtcDate(),
  hasBeenRevealed: false,
  name: '',
  partnerPokemon: null,
  specialty: null,
  version: TRAINER_PROFILE_VERSION,
});

const normalizeTrainerProfile = (value: unknown): TrainerProfile | null => {
  if (!value || typeof value !== 'object') return null;
  const profile = value as Partial<TrainerProfile>;
  if (
    profile.version !== TRAINER_PROFILE_VERSION ||
    typeof profile.cardNumber !== 'string' ||
    !/^QZ-\d{6}$/.test(profile.cardNumber) ||
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
    accent: trainerAccents.includes(profile.accent as TrainerAccent)
      ? (profile.accent as TrainerAccent)
      : 'cobalt',
    cardNumber: profile.cardNumber,
    createdAt: profile.createdAt,
    hasBeenRevealed: profile.hasBeenRevealed,
    name: profile.name.trim().slice(0, 20),
    partnerPokemon: profile.partnerPokemon,
    specialty: profile.specialty as TrainerSpecialty | null,
    version: TRAINER_PROFILE_VERSION,
  };
};

export const readTrainerProfile = (): TrainerProfile => {
  const profile = normalizeTrainerProfile(
    readStoredJson('localStorage', TRAINER_PROFILE_KEY),
  );
  if (profile) return profile;

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

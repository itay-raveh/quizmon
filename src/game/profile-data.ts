import { getLocalDate } from './daily';
import { trainerSpecialtyLabels, type TrainerSpecialty } from './trainer';
import { isDailyDate, isRecord } from './validation';

const TRAINER_PROFILE_VERSION = 1;

export interface TrainerProfile {
  createdAt: string;
  hasBeenRevealed: boolean;
  name: string;
  partnerPokemon: string | null;
  specialty: TrainerSpecialty | null;
  version: number;
}

export const createTrainerProfile = (): TrainerProfile => ({
  createdAt: getLocalDate(),
  hasBeenRevealed: false,
  name: '',
  partnerPokemon: null,
  specialty: null,
  version: TRAINER_PROFILE_VERSION,
});

export const normalizeTrainerProfile = (
  value: unknown,
): TrainerProfile | null => {
  if (!isRecord(value)) return null;
  const profile = value as Partial<TrainerProfile>;
  if (
    profile.version !== TRAINER_PROFILE_VERSION ||
    !isDailyDate(profile.createdAt) ||
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

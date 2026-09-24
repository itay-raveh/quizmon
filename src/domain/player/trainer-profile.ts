import { z } from 'zod';
import { dailyDateSchema } from '../../lib/validation.ts';
import { getUtcDate } from '../quiz/daily.ts';
import { isTrainerAvatar } from './trainer-avatars.ts';
import {
  trainerSpecialtyDetails,
  type TrainerSpecialty,
} from './trainer-progression.ts';

export const TRAINER_NAME_MAX_LENGTH = 20;

export const trainerProfileSchema = z.object({
  avatar: z
    .custom<string>(isTrainerAvatar)
    .nullish()
    .transform((avatar) => avatar ?? null),
  createdAt: dailyDateSchema,
  hasBeenRevealed: z.boolean(),
  name: z
    .string()
    .transform((name) => name.trim().slice(0, TRAINER_NAME_MAX_LENGTH)),
  partnerPokemon: z.string().nullable(),
  specialty: z
    .enum(
      Object.keys(trainerSpecialtyDetails) as [
        TrainerSpecialty,
        ...TrainerSpecialty[],
      ],
    )
    .nullable(),
});

export type TrainerProfile = z.infer<typeof trainerProfileSchema>;

export const createTrainerProfile = (): TrainerProfile => ({
  avatar: null,
  createdAt: getUtcDate(),
  hasBeenRevealed: false,
  name: '',
  partnerPokemon: null,
  specialty: null,
});

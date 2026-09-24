import { z } from 'zod';
import type { TrainerStats } from '../../domain/player/progress';
import { progressSchema } from '../../domain/player/schemas/player-data';
import {
  trainerProfileSchema,
  type TrainerProfile,
} from '../../domain/player/trainer-profile';
import {
  socialPlayerSchema,
  type SocialPlayer,
} from '../../domain/social/friends';
import { accountSnapshot } from '../account/account';

export interface PublicTrainer {
  player: SocialPlayer;
  profile: TrainerProfile;
  stats: TrainerStats;
  pokedex: string[];
  record: { dayCombo: number; pokedexFound: number; pokedexTotal: number };
}

const count = z.int().min(0);
const publicTrainerSchema = z.object({
  player: socialPlayerSchema,
  profile: trainerProfileSchema,
  stats: progressSchema.extend({
    bestDailyStreak: count,
    leagueCompleted: z.boolean(),
    pokedex: z.array(z.string()).optional(),
  }),
  pokedex: z.array(z.string()),
  record: z.object({
    dayCombo: count,
    pokedexFound: count,
    pokedexTotal: count,
  }),
});

function parsePublicTrainer(value: unknown): PublicTrainer {
  const parsed = publicTrainerSchema.safeParse(value);
  if (!parsed.success)
    throw new Error('This Trainer card could not be loaded. Try again.');
  return parsed.data;
}

export async function fetchPublicTrainer(
  owner: string,
  playerId: string,
  signal?: AbortSignal,
): Promise<PublicTrainer> {
  if (accountSnapshot().owner !== owner)
    throw new Error('Your account changed. Sign in again to view Trainers.');
  const response = await fetch(
    `/api/trainers/${encodeURIComponent(playerId)}`,
    {
      credentials: 'same-origin',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000),
    },
  );
  if (response.status === 401)
    throw new Error('Sign in again to view Trainers.');
  if (response.status === 404)
    throw new Error('This Trainer is no longer available.');
  if (!response.ok)
    throw new Error('Trainer cards are unavailable. Reconnect and try again.');
  if (!response.headers.get('Content-Type')?.includes('application/json'))
    throw new Error('Trainer cards are unavailable. Reconnect and try again.');
  const trainer = parsePublicTrainer(await response.json());
  if (accountSnapshot().owner !== owner || trainer.player.id !== playerId)
    throw new Error('Your account changed. Sign in again to view Trainers.');
  return trainer;
}

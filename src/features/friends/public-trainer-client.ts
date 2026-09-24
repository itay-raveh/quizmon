import type { TrainerStats } from '../../domain/player/progress';
import {
  normalizeTrainerProfile,
  type TrainerProfile,
} from '../../domain/player/trainer-profile';
import type { SocialPlayer } from '../../domain/social/friends';
import { isRecord } from '../../lib/validation';
import { accountSnapshot } from '../account/account';

export interface PublicTrainer {
  player: SocialPlayer;
  profile: TrainerProfile;
  stats: TrainerStats;
  pokedex: string[];
  record: { dayCombo: number; pokedexFound: number; pokedexTotal: number };
}

const nonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const names = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((name) => typeof name === 'string');
const counts = (value: unknown) =>
  isRecord(value) && Object.values(value).every(nonnegative);

function parsePublicTrainer(value: unknown): PublicTrainer {
  if (!isRecord(value) || !isRecord(value.player))
    throw new Error('This Trainer card could not be loaded. Try again.');
  const { player, stats, record } = value;
  const profile = normalizeTrainerProfile(value.profile);
  if (
    typeof player.id !== 'string' ||
    typeof player.name !== 'string' ||
    !(player.code === null || typeof player.code === 'string') ||
    !(
      player.partnerPokemon === null ||
      typeof player.partnerPokemon === 'string'
    ) ||
    !profile ||
    !isRecord(stats) ||
    !names(stats.correctPokemon) ||
    !counts(stats.correctCategories) ||
    !counts(stats.correctGenerations) ||
    !counts(stats.correctQuestionTypes) ||
    !nonnegative(stats.championAnswersWithoutClues) ||
    !nonnegative(stats.masteryRounds) ||
    !nonnegative(stats.quickAttackRounds) ||
    !nonnegative(stats.bestDailyStreak) ||
    typeof stats.leagueCompleted !== 'boolean' ||
    !names(value.pokedex) ||
    !isRecord(record) ||
    !nonnegative(record.dayCombo) ||
    !nonnegative(record.pokedexFound) ||
    !nonnegative(record.pokedexTotal)
  )
    throw new Error('This Trainer card could not be loaded. Try again.');
  return {
    player: player as unknown as SocialPlayer,
    profile,
    stats: stats as unknown as TrainerStats,
    pokedex: value.pokedex,
    record: {
      dayCombo: record.dayCombo,
      pokedexFound: record.pokedexFound,
      pokedexTotal: record.pokedexTotal,
    },
  };
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

import type { AccountEnv } from './api.ts';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import pokemonGenerations from '../src/domain/pokemon/data/pokemon-generations.json' with { type: 'json' };
import {
  getDailyStreak,
  getTrainerStats,
} from '../src/domain/player/progress.ts';
import { normalizeResults } from '../src/domain/player/results.ts';
import { createTrainerProfile } from '../src/domain/player/trainer-profile.ts';
import { trainerSpecialtyDetails } from '../src/domain/player/trainer-progression.ts';
import { isTrainerAvatar } from '../src/domain/player/trainer-avatars.ts';
import { emptyContribution } from '../src/domain/sync/progress.ts';
import { getUtcDate } from '../src/domain/quiz/daily.ts';
import { user } from './auth-schema.ts';
import { isAccountId } from './friends.ts';
import { publicPlayers } from './friend-identity.ts';
import {
  accountState,
  dailyResults,
  playerPokemon,
} from './progress-schema.ts';

export const trainerApi = new Hono<AccountEnv>();

trainerApi.get('/:id', async (context) => {
  const id = context.req.param('id');
  if (!isAccountId(id))
    return context.json({ error: 'trainer_not_found' }, 404);
  const db = context.get('db');
  const [state] = await db
    .select({
      generationId: accountState.generationId,
      profileCreatedAt: accountState.profileCreatedAt,
      progress: accountState.progress,
      edits: accountState.edits,
    })
    .from(accountState)
    .where(eq(accountState.id, id));
  const [player] = await publicPlayers(db, [id]);
  if (!player) return context.json({ error: 'trainer_not_found' }, 404);
  const [[account], pokemon, days] = await Promise.all([
    db.select({ createdAt: user.createdAt }).from(user).where(eq(user.id, id)),
    state
      ? db
          .select({ name: playerPokemon.pokemon })
          .from(playerPokemon)
          .where(
            and(
              eq(playerPokemon.ownerId, id),
              eq(playerPokemon.generationId, state.generationId),
              eq(playerPokemon.discovered, true),
            ),
          )
      : [],
    state
      ? db
          .select({ date: dailyResults.date })
          .from(dailyResults)
          .where(
            and(
              eq(dailyResults.ownerId, id),
              eq(dailyResults.generationId, state.generationId),
              eq(dailyResults.streakCredit, true),
            ),
          )
      : [],
  ]);
  const pokedex = pokemon.map(({ name }) => name);
  const creditedDates = days.map(({ date }) => date);
  const results = normalizeResults({
    progress: {
      ...(state?.progress ?? emptyContribution()),
      quickAttackCompleted: (state?.progress.quickAttackRounds ?? 0) > 0,
    },
  });
  results.streak.creditedDates = creditedDates;
  results.league.completed = state?.progress.leagueCompleted ?? false;
  const stats = getTrainerStats(results, pokedex);
  const profile = {
    ...createTrainerProfile(),
    createdAt:
      state?.profileCreatedAt ??
      account?.createdAt.toISOString().slice(0, 10) ??
      getUtcDate(),
    name: typeof state?.edits.name === 'string' ? state.edits.name : '',
    avatar: isTrainerAvatar(state?.edits.avatar) ? state.edits.avatar : null,
    partnerPokemon: player.partnerPokemon,
    specialty:
      typeof state?.edits.specialty === 'string' &&
      Object.hasOwn(trainerSpecialtyDetails, state.edits.specialty)
        ? state.edits.specialty
        : null,
    hasBeenRevealed: true,
  };
  return context.json({
    player,
    profile,
    stats,
    pokedex,
    record: {
      dayCombo: getDailyStreak(creditedDates, getUtcDate()),
      pokedexFound: pokedex.length,
      pokedexTotal: Object.keys(pokemonGenerations).length,
    },
  });
});

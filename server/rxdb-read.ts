import type { PlayerDatabase } from '../src/lib/storage/rxdb-database.ts';
import { createTrainerProfile } from '../src/domain/player/trainer-profile.ts';
import { projectCompactRoundHistory } from '../src/domain/player/compact-history.ts';
import {
  getDailyStreak,
  getTrainerStats,
} from '../src/domain/player/progress.ts';
import { getUtcDate } from '../src/domain/quiz/daily.ts';
import {
  compactRoundSchema,
  scoreCompactRound,
} from '../src/domain/sync/compact-rounds.ts';
import { isLeagueVictory } from '../src/domain/quiz/league.ts';
import pokemonGenerations from '../src/domain/pokemon/data/pokemon-generations.json' with { type: 'json' };
import * as Sentry from '@sentry/node';

export async function playerProfiles(db: PlayerDatabase, ids: string[]) {
  const players = await db.players.findByIds(ids).exec();
  const leagueRounds = ids.length
    ? await db.rounds
        .find({ selector: { ownerId: { $in: ids }, mode: 'league' } })
        .exec()
    : [];
  const champions = new Set(
    leagueRounds.flatMap((round) => {
      const parsed = compactRoundSchema.safeParse(round.toMutableJSON());
      return parsed.success && isLeagueVictory(scoreCompactRound(parsed.data))
        ? [round.ownerId]
        : [];
    }),
  );
  return ids.map((id) => ({
    id,
    profile: players.get(id)?.profile ?? createTrainerProfile(),
    leagueCompleted: champions.has(id),
  }));
}

export async function trainerProfile(db: PlayerDatabase, id: string) {
  const profile =
    (await db.players.findOne(id).exec())?.profile ?? createTrainerProfile();
  const rounds = await db.rounds.find({ selector: { ownerId: id } }).exec();
  const projection = Sentry.startSpan(
    { name: 'trainer.project', op: 'function' },
    () =>
      projectCompactRoundHistory(
        rounds.map((round) => compactRoundSchema.parse(round.toMutableJSON())),
        profile.name,
      ),
  );
  const pokedex = projection.pokedex;
  const stats = getTrainerStats(projection.results, pokedex);
  return {
    player: {
      id,
      name: profile.name.trim() || 'Trainer',
      partnerPokemon: profile.partnerPokemon,
      leagueCompleted: stats.leagueCompleted,
    },
    profile,
    stats,
    pokedex,
    record: {
      dayCombo: getDailyStreak(
        projection.results.streak.creditedDates,
        getUtcDate(),
      ),
      pokedexFound: pokedex.length,
      pokedexTotal: Object.keys(pokemonGenerations).length,
    },
  };
}

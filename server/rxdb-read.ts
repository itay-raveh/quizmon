import type { PlayerDatabase } from '../src/lib/storage/rxdb-database.ts';
import { createTrainerProfile } from '../src/domain/player/trainer-profile.ts';
import { projectCompactRoundHistory } from '../src/domain/player/compact-history.ts';
import {
  getDailyStreak,
  getTrainerStats,
} from '../src/domain/player/progress.ts';
import { getUtcDate } from '../src/domain/quiz/daily.ts';
import { compactRoundSchema } from '../src/domain/sync/compact-rounds.ts';
import pokemonGenerations from '../src/domain/pokemon/data/pokemon-generations.json' with { type: 'json' };

export async function playerProfiles(db: PlayerDatabase, ids: string[]) {
  const players = await db.players.findByIds(ids).exec();
  return ids.map((id) => ({
    id,
    profile: players.get(id)?.profile ?? createTrainerProfile(),
  }));
}

export async function trainerProfile(db: PlayerDatabase, id: string) {
  const profile =
    (await db.players.findOne(id).exec())?.profile ?? createTrainerProfile();
  const rounds = await db.rounds.find({ selector: { ownerId: id } }).exec();
  const projection = projectCompactRoundHistory(
    rounds.map((round) => compactRoundSchema.parse(round.toMutableJSON())),
    profile.name,
  );
  const pokedex = projection.pokedex;
  return {
    profile,
    stats: getTrainerStats(projection.results, pokedex),
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

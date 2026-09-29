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
  return Promise.all(
    ids.map(async (id) => ({
      id,
      profile:
        (await db.players.findOne(id).exec())?.profile ??
        createTrainerProfile(),
    })),
  );
}

export async function trainerProfile(db: PlayerDatabase, id: string) {
  const profile =
    (await db.players.findOne(id).exec())?.profile ?? createTrainerProfile();
  const [rounds, receipts] = await Promise.all([
    db.rounds.find({ selector: { ownerId: id } }).exec(),
    db.dailyReceipts.find({ selector: { ownerId: id } }).exec(),
  ]);
  const projection = projectCompactRoundHistory(
    rounds.map((round) => compactRoundSchema.parse(round.toMutableJSON())),
    profile.name,
    new Set(receipts.map((receipt) => receipt.roundId)),
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

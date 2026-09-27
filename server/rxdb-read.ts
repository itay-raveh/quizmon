import type { PlayerDatabase } from '../src/lib/storage/rxdb-database.ts';
import { createTrainerProfile } from '../src/domain/player/trainer-profile.ts';
import { projectRoundHistory } from '../src/domain/player/game-history.ts';
import {
  getDailyStreak,
  getTrainerStats,
} from '../src/domain/player/progress.ts';
import { getUtcDate } from '../src/domain/quiz/daily.ts';
import {
  scoreRound,
  validateRoundFact,
} from '../src/domain/sync/round-facts.ts';
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
  const rounds = await db.rounds.find({ selector: { ownerId: id } }).exec();
  const projection = projectRoundHistory(
    rounds
      .map((round) => round.fact)
      .sort(
        (a, b) =>
          a.completed_at.localeCompare(b.completed_at) ||
          a.id.localeCompare(b.id),
      ),
  );
  const pokedex = projection.pokedex;
  return {
    profile: { ...profile, hasBeenRevealed: true },
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

export async function boardRows(
  db: PlayerDatabase,
  mode: 'daily' | 'training',
  visible: string[] | null,
  day?: string,
  puzzleId?: string,
  includeOther = false,
) {
  // ponytail: scores are calculated on read; add a server index when board traffic grows.
  const rounds = (await db.rounds.find().exec()).filter((round) =>
    validateRoundFact(round.fact),
  );
  const allowed = visible ? new Set(visible) : null;
  const firstDaily = new Map<string, (typeof rounds)[number]>();
  if (mode === 'daily')
    for (const round of rounds) {
      const fact = round.fact;
      if (fact.mode !== 'daily' || !fact.credited) continue;
      const key = `${round.ownerId}:${fact.day}`;
      const first = firstDaily.get(key);
      if (
        !first ||
        fact.completed_at < first.fact.completed_at ||
        (fact.completed_at === first.fact.completed_at && round.id < first.id)
      )
        firstDaily.set(key, round);
    }
  const rows = rounds.flatMap((round) => {
    const fact = round.fact;
    if (
      fact.mode !== mode ||
      !fact.credited ||
      (allowed && !allowed.has(round.ownerId)) ||
      (mode === 'daily' &&
        (fact.day !== day ||
          (!includeOther && fact.puzzle_id !== puzzleId) ||
          firstDaily.get(`${round.ownerId}:${fact.day}`)?.id !== round.id ||
          fact.completed_at.slice(0, 10) !== day))
    )
      return [];
    const result = scoreRound(fact);
    return [
      {
        playerId: round.ownerId,
        roundId: round.id,
        completedAt: fact.completed_at,
        score: result.score,
        elapsedMilliseconds: result.elapsedMilliseconds ?? 0,
        comparable: mode !== 'daily' || fact.puzzle_id === puzzleId,
      },
    ];
  });
  rows.sort(
    (a, b) =>
      Number(b.comparable) - Number(a.comparable) ||
      b.score - a.score ||
      a.elapsedMilliseconds - b.elapsedMilliseconds ||
      a.completedAt.localeCompare(b.completedAt) ||
      a.roundId.localeCompare(b.roundId) ||
      a.playerId.localeCompare(b.playerId),
  );
  const seen = new Set<string>();
  const best =
    mode === 'training'
      ? rows.filter((row) => {
          if (seen.has(row.playerId)) return false;
          seen.add(row.playerId);
          return true;
        })
      : rows;
  let rank = 0;
  return best.map((row, index) => {
    if (!row.comparable) return { ...row, rank: null, ordinal: index + 1 };
    const previous = best[index - 1];
    if (
      !previous ||
      previous.score !== row.score ||
      previous.elapsedMilliseconds !== row.elapsedMilliseconds
    )
      rank = index + 1;
    return { ...row, rank, ordinal: index + 1 };
  });
}

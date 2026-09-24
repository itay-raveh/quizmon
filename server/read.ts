import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  Leaderboard,
  LeaderboardScope,
} from '../src/domain/social/leaderboards.ts';
import { projectRoundHistory } from '../src/domain/player/game-history.ts';
import {
  getDailyStreak,
  getTrainerStats,
} from '../src/domain/player/progress.ts';
import { createTrainerProfile } from '../src/domain/player/trainer-profile.ts';
import { getUtcDate } from '../src/domain/quiz/daily.ts';
import type { RoundFact } from '../src/domain/sync/round-facts.ts';
import pokemonGenerations from '../src/domain/pokemon/data/pokemon-generations.json' with { type: 'json' };
import * as schema from './schema.ts';

type StoredRound = typeof schema.round.$inferSelect;

const roundFact = (row: StoredRound): RoundFact => ({
  id: row.id,
  mode: row.mode as RoundFact['mode'],
  day: row.day,
  puzzle_id: row.puzzleId,
  started_on: row.startedOn,
  completed_at: new Date(row.completedAt).toISOString(),
  credited: row.credited,
  data: row.data,
});

async function loadPlayerRounds(db: NodePgDatabase, playerId: string) {
  const rows = await db
    .select()
    .from(schema.round)
    .where(eq(schema.round.playerId, playerId))
    .orderBy(schema.round.completedAt, schema.round.id);
  return rows.map(roundFact);
}

export async function publicPlayers(db: NodePgDatabase, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db
    .select({
      id: schema.player.id,
      code: schema.player.code,
      name: schema.player.name,
      partnerPokemon: schema.player.partner,
    })
    .from(schema.player)
    .where(inArray(schema.player.id, ids));
  return rows.map((row) => ({ ...row, name: row.name.trim() || 'Trainer' }));
}

export async function readTrainer(db: NodePgDatabase, id: string) {
  const [player] = await db
    .select()
    .from(schema.player)
    .where(eq(schema.player.id, id));
  if (!player) return null;
  const rounds = await loadPlayerRounds(db, id);
  const projection = projectRoundHistory(rounds);
  const pokedex = projection.pokedex;
  const stats = getTrainerStats(projection.results, pokedex);
  const publicPlayer = (await publicPlayers(db, [id]))[0]!;
  const profile = {
    ...createTrainerProfile(),
    createdAt: player.joinedOn,
    name: player.name,
    avatar: player.avatar,
    partnerPokemon: player.partner,
    specialty: player.specialty,
    hasBeenRevealed: true,
  };
  return {
    player: publicPlayer,
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

export async function readBoard(
  db: NodePgDatabase,
  viewerId: string,
  mode: 'daily' | 'training',
  scope: LeaderboardScope,
  offset: number,
  limit: number,
  day?: string,
  puzzleId?: string,
): Promise<Leaderboard> {
  return db.transaction(
    async (tx) => {
      let visible: Set<string> | undefined;
      if (scope === 'friends') {
        const rows = await tx
          .select()
          .from(schema.friend)
          .where(
            and(
              eq(schema.friend.status, 'accepted'),
              or(
                eq(schema.friend.fromId, viewerId),
                eq(schema.friend.toId, viewerId),
              ),
            ),
          );
        visible = new Set([
          viewerId,
          ...rows.map((row) =>
            row.fromId === viewerId ? row.toId : row.fromId,
          ),
        ]);
      }
      const filter = and(
        eq(schema.round.mode, mode),
        eq(schema.round.credited, true),
        mode === 'daily' ? eq(schema.round.day, day!) : undefined,
        mode === 'daily' ? eq(schema.round.puzzleId, puzzleId!) : undefined,
        mode === 'daily' ? eq(schema.round.startedOn, day!) : undefined,
        visible ? inArray(schema.round.playerId, [...visible]) : undefined,
      );
      const candidates = sql`SELECT ${schema.round.playerId} AS player_id,
        ${schema.round.id} AS round_id, ${schema.round.completedAt} AS completed_at,
        ${schema.roundScore.score} AS score, ${schema.roundScore.elapsedMs} AS elapsed_ms
        FROM ${schema.round} JOIN ${schema.roundScore}
        ON ${schema.roundScore.roundId} = ${schema.round.id} WHERE ${filter}`;
      const best =
        mode === 'training'
          ? sql`SELECT DISTINCT ON (player_id) * FROM (${candidates}) candidates
          ORDER BY player_id, score DESC, elapsed_ms, completed_at, round_id`
          : candidates;
      const result = await tx.execute<{
        total: number;
        player_id: string | null;
        round_id: string | null;
        score: number | null;
        elapsed_ms: number | null;
        rank: number | null;
        ordinal: number | null;
      }>(sql`WITH best AS (${best}), ranked AS (
          SELECT *, RANK() OVER (ORDER BY score DESC, elapsed_ms)::integer AS rank,
            ROW_NUMBER() OVER (ORDER BY score DESC, elapsed_ms, completed_at, round_id, player_id)::integer AS ordinal
          FROM best
        ), counts AS (SELECT count(*)::integer AS total FROM best)
        SELECT counts.total, ranked.* FROM counts LEFT JOIN ranked
          ON (ranked.ordinal > ${offset} AND ranked.ordinal <= ${offset + limit})
          OR ranked.player_id = ${viewerId}
        ORDER BY ranked.ordinal`);
      const rows = result.rows.filter((row) => row.player_id !== null);
      const page = rows.filter(
        (row) => row.ordinal! > offset && row.ordinal! <= offset + limit,
      );
      const viewer = rows.find((row) => row.player_id === viewerId);
      const players = new Map(
        (
          await publicPlayers(tx, [
            ...new Set(rows.map((row) => row.player_id!)),
          ])
        ).map((player) => [player.id, player]),
      );
      const entry = (row: (typeof rows)[number]) => ({
        player: players.get(row.player_id!)!,
        rank: row.rank!,
        score: row.score!,
        elapsedMilliseconds: row.elapsed_ms!,
      });
      const total = result.rows[0]?.total ?? 0;
      return {
        accountId: viewerId,
        ...(mode === 'daily' ? { date: day } : {}),
        scope,
        checkedAt: new Date().toISOString(),
        total,
        items: page.map(entry),
        viewer: viewer ? entry(viewer) : null,
        nextCursor: offset + limit < total ? String(offset + limit) : null,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}

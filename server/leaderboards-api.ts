import type { AccountEnv } from './api.ts';
import { and, eq, exists, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Hono } from 'hono';
import { dailyDefinition } from '../src/domain/quiz/daily-definition.ts';
import { SCORE_VERSION } from '../src/domain/quiz/scoring.ts';
import type {
  DailyLeaderboard,
  Leaderboard,
  LeaderboardScope,
} from '../src/domain/social/leaderboards.ts';
import { isDailyDate } from '../src/lib/validation.ts';
import { friendRequests } from './friend-schema.ts';
import { publicPlayers } from './friend-identity.ts';
import {
  accountState,
  completionFacts,
  dailyResults,
} from './progress-schema.ts';

function friendsOf(
  db: NodePgDatabase,
  accountId: string,
  ownerId: typeof dailyResults.ownerId | typeof completionFacts.ownerId,
) {
  return db
    .select({ id: friendRequests.id })
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.status, 'accepted'),
        or(
          and(
            eq(friendRequests.userLow, accountId),
            eq(friendRequests.userHigh, ownerId),
          ),
          and(
            eq(friendRequests.userHigh, accountId),
            eq(friendRequests.userLow, ownerId),
          ),
        ),
      ),
    );
}

async function dailyStandings(
  db: NodePgDatabase,
  accountId: string,
  date: string,
  puzzleId: string,
  scope: LeaderboardScope,
  offset: number,
  limit: number,
): Promise<DailyLeaderboard> {
  const definition = dailyDefinition;
  return db.transaction(
    async (tx) => {
      const friends = friendsOf(tx, accountId, dailyResults.ownerId);
      const rows = tx.$with('ranked').as(
        tx
          .select({
            ownerId: dailyResults.ownerId,
            score: dailyResults.score,
            elapsedMilliseconds: dailyResults.elapsedMilliseconds,
            rank: sql<number>`rank() OVER (ORDER BY ${dailyResults.score} DESC, ${dailyResults.elapsedMilliseconds} ASC)`
              .mapWith(Number)
              .as('rank'),
          })
          .from(dailyResults)
          .innerJoin(
            completionFacts,
            and(
              eq(completionFacts.ownerId, dailyResults.ownerId),
              eq(completionFacts.generationId, dailyResults.generationId),
              eq(completionFacts.completionId, dailyResults.completionId),
            ),
          )
          .innerJoin(
            accountState,
            and(
              eq(accountState.id, dailyResults.ownerId),
              eq(accountState.generationId, dailyResults.generationId),
            ),
          )
          .where(
            and(
              eq(dailyResults.date, date),
              eq(dailyResults.streakCredit, true),
              eq(completionFacts.eligible, true),
              eq(completionFacts.mode, 'daily'),
              eq(completionFacts.scoreVersion, definition.score),
              sql`${dailyResults.result}->>'puzzleId' = ${puzzleId}`,
              sql`${dailyResults.result}->'dailyTrack' = ${JSON.stringify(definition.track)}::jsonb`,
              sql`${dailyResults.result}->'rules'->'difficulty' = ${String(definition.track.difficulty)}::jsonb`,
              sql`${dailyResults.result}->'rules'->'generations' @> ${JSON.stringify(definition.generations)}::jsonb`,
              sql`${dailyResults.result}->'rules'->'formGroups' @> ${JSON.stringify(definition.formGroups)}::jsonb`,
              scope === 'friends'
                ? or(eq(dailyResults.ownerId, accountId), exists(friends))
                : undefined,
            ),
          ),
      );
      const selected = await tx
        .with(rows)
        .select()
        .from(rows)
        .orderBy(
          sql`${rows.score} DESC`,
          rows.elapsedMilliseconds,
          rows.ownerId,
        )
        .limit(limit + 1)
        .offset(offset);
      const [own] = await tx
        .with(rows)
        .select()
        .from(rows)
        .where(eq(rows.ownerId, accountId));
      const [count] = await tx
        .with(rows)
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(rows);
      const page = selected.slice(0, limit);
      const players = new Map(
        (
          await publicPlayers(tx, [
            ...new Set([
              ...page.map((row) => row.ownerId),
              ...(own ? [own.ownerId] : []),
            ]),
          ])
        ).map((player) => [player.id, player]),
      );
      const entry = (row: (typeof selected)[number]) => ({
        player: players.get(row.ownerId)!,
        rank: row.rank,
        score: row.score,
        elapsedMilliseconds: row.elapsedMilliseconds,
      });
      return {
        accountId,
        date,
        scope,
        checkedAt: new Date().toISOString(),
        total: count!.total,
        items: page.map(entry),
        viewer: own ? entry(own) : null,
        nextCursor: selected.length > limit ? String(offset + limit) : null,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}

async function trainingStandings(
  db: NodePgDatabase,
  accountId: string,
  scope: LeaderboardScope,
  offset: number,
  limit: number,
): Promise<Leaderboard> {
  return db.transaction(
    async (tx) => {
      const score = sql<number>`(${completionFacts.completion}->'result'->>'score')::integer`;
      const elapsed = sql<number>`(${completionFacts.completion}->'result'->>'elapsedMilliseconds')::integer`;
      const friends = friendsOf(tx, accountId, completionFacts.ownerId);
      const best = tx.$with('best').as(
        tx
          .select({
            ownerId: completionFacts.ownerId,
            score: score.mapWith(Number).as('score'),
            elapsedMilliseconds: elapsed
              .mapWith(Number)
              .as('elapsed_milliseconds'),
            position:
              sql<number>`row_number() OVER (PARTITION BY ${completionFacts.ownerId} ORDER BY ${score} DESC, ${elapsed} ASC, ${completionFacts.completedAt} ASC, ${completionFacts.completionId} ASC)`
                .mapWith(Number)
                .as('position'),
          })
          .from(completionFacts)
          .innerJoin(
            accountState,
            and(
              eq(accountState.id, completionFacts.ownerId),
              eq(accountState.generationId, completionFacts.generationId),
            ),
          )
          .where(
            and(
              eq(completionFacts.mode, 'training'),
              eq(completionFacts.eligible, true),
              eq(completionFacts.scoreVersion, SCORE_VERSION),
              scope === 'friends'
                ? or(eq(completionFacts.ownerId, accountId), exists(friends))
                : undefined,
            ),
          ),
      );
      const ranked = tx.$with('ranked').as(
        tx
          .with(best)
          .select({
            ownerId: best.ownerId,
            score: best.score,
            elapsedMilliseconds: best.elapsedMilliseconds,
            rank: sql<number>`rank() OVER (ORDER BY ${best.score} DESC, ${best.elapsedMilliseconds} ASC)`
              .mapWith(Number)
              .as('rank'),
          })
          .from(best)
          .where(eq(best.position, 1)),
      );
      const selected = await tx
        .with(best, ranked)
        .select()
        .from(ranked)
        .orderBy(
          sql`${ranked.score} DESC`,
          ranked.elapsedMilliseconds,
          ranked.ownerId,
        )
        .limit(limit + 1)
        .offset(offset);
      const [own] = await tx
        .with(best, ranked)
        .select()
        .from(ranked)
        .where(eq(ranked.ownerId, accountId));
      const [count] = await tx
        .with(best, ranked)
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(ranked);
      const page = selected.slice(0, limit);
      const players = new Map(
        (
          await publicPlayers(tx, [
            ...new Set([
              ...page.map((row) => row.ownerId),
              ...(own ? [own.ownerId] : []),
            ]),
          ])
        ).map((player) => [player.id, player]),
      );
      const entry = (row: (typeof selected)[number]) => ({
        player: players.get(row.ownerId)!,
        rank: row.rank,
        score: row.score,
        elapsedMilliseconds: row.elapsedMilliseconds,
      });
      return {
        accountId,
        scope,
        checkedAt: new Date().toISOString(),
        total: count!.total,
        items: page.map(entry),
        viewer: own ? entry(own) : null,
        nextCursor: selected.length > limit ? String(offset + limit) : null,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}

export const leaderboardApi = new Hono<AccountEnv>();
leaderboardApi.get('/daily', async (context) => {
  const date =
    context.req.query('date') ?? new Date().toISOString().slice(0, 10);
  const scope = context.req.query('scope') ?? 'global';
  const puzzleId = context.req.query('puzzle');
  const after = context.req.query('after') ?? '0';
  const limit = context.req.query('limit') ?? '50';
  if (
    !isDailyDate(date) ||
    date > new Date().toISOString().slice(0, 10) ||
    !puzzleId ||
    !/^[a-f0-9]{64}$/.test(puzzleId) ||
    (scope !== 'global' && scope !== 'friends') ||
    !/^\d{1,9}$/.test(after) ||
    !/^\d{1,3}$/.test(limit) ||
    Number(limit) < 1 ||
    Number(limit) > 100
  )
    return context.json({ error: 'invalid_leaderboard' }, 400);
  context.header('Cache-Control', 'no-store');
  return context.json(
    await dailyStandings(
      context.get('db'),
      context.get('accountId'),
      date,
      puzzleId,
      scope,
      Number(after),
      Number(limit),
    ),
  );
});

leaderboardApi.get('/training', async (context) => {
  const scope = context.req.query('scope') ?? 'global';
  const after = context.req.query('after') ?? '0';
  const limit = context.req.query('limit') ?? '50';
  if (
    (scope !== 'global' && scope !== 'friends') ||
    !/^\d{1,9}$/.test(after) ||
    !/^\d{1,3}$/.test(limit) ||
    Number(limit) < 1 ||
    Number(limit) > 100
  )
    return context.json({ error: 'invalid_leaderboard' }, 400);
  context.header('Cache-Control', 'no-store');
  return context.json(
    await trainingStandings(
      context.get('db'),
      context.get('accountId'),
      scope,
      Number(after),
      Number(limit),
    ),
  );
});

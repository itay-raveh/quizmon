import type { AccountEnv } from './api.ts';
import { and, eq, exists, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Hono } from 'hono';
import { dailyDefinition } from '../src/domain/quiz/daily-definition.ts';
import type {
  DailyLeaderboard,
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

async function dailyStandings(
  db: NodePgDatabase,
  accountId: string,
  date: string,
  scope: LeaderboardScope,
  offset: number,
  limit: number,
): Promise<DailyLeaderboard> {
  const revision = dailyDefinition;
  return db.transaction(
    async (tx) => {
      const friends = tx
        .select({ id: friendRequests.id })
        .from(friendRequests)
        .where(
          and(
            eq(friendRequests.status, 'accepted'),
            or(
              and(
                eq(friendRequests.userLow, accountId),
                eq(friendRequests.userHigh, dailyResults.ownerId),
              ),
              and(
                eq(friendRequests.userHigh, accountId),
                eq(friendRequests.userLow, dailyResults.ownerId),
              ),
            ),
          ),
        );
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
              eq(completionFacts.contentVersion, revision.content),
              eq(completionFacts.scoreVersion, revision.score),
              eq(completionFacts.generatorVersion, revision.generator),
              sql`${dailyResults.result}->'dailyTrack' = ${JSON.stringify(revision.track)}::jsonb`,
              sql`${dailyResults.result}->'rules'->'version' = ${String(revision.rules)}::jsonb`,
              sql`${dailyResults.result}->'rules'->'difficulty' = ${String(revision.track.difficulty)}::jsonb`,
              sql`${dailyResults.result}->'rules'->'generations' @> ${JSON.stringify(revision.generations)}::jsonb`,
              sql`${dailyResults.result}->'rules'->'formGroups' @> ${JSON.stringify(revision.formGroups)}::jsonb`,
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

export const leaderboardApi = new Hono<AccountEnv>();
leaderboardApi.get('/daily', async (context) => {
  const date =
    context.req.query('date') ?? new Date().toISOString().slice(0, 10);
  const scope = context.req.query('scope') ?? 'global';
  const after = context.req.query('after') ?? '0';
  const limit = context.req.query('limit') ?? '50';
  if (
    !isDailyDate(date) ||
    date > new Date().toISOString().slice(0, 10) ||
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
      scope,
      Number(after),
      Number(limit),
    ),
  );
});

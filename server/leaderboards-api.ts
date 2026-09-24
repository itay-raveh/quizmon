import type { AccountEnv } from './api.ts';
import { Hono } from 'hono';
import { isDailyDate } from '../src/lib/validation.ts';
import { readBoard } from './read.ts';

export const leaderboardApi = new Hono<AccountEnv>();

function parameters(query: (key: string) => string | undefined): {
  scope: 'global' | 'friends';
  offset: number;
  limit: number;
} | null {
  const scope = query('scope') ?? 'global';
  const after = query('after') ?? '0';
  const limit = query('limit') ?? '50';
  if (
    (scope !== 'global' && scope !== 'friends') ||
    !/^\d{1,9}$/.test(after) ||
    !/^\d{1,3}$/.test(limit) ||
    Number(limit) < 1 ||
    Number(limit) > 100
  )
    return null;
  return { scope, offset: Number(after), limit: Number(limit) };
}

leaderboardApi.get('/daily', async (context) => {
  const date =
    context.req.query('date') ?? new Date().toISOString().slice(0, 10);
  const puzzleId = context.req.query('puzzle');
  const page = parameters((key) => context.req.query(key));
  if (
    !page ||
    !isDailyDate(date) ||
    date > new Date().toISOString().slice(0, 10) ||
    !puzzleId ||
    !/^[a-f0-9]{64}$/.test(puzzleId)
  )
    return context.json({ error: 'invalid_leaderboard' }, 400);
  return context.json(
    await readBoard(
      context.get('db'),
      context.get('accountId'),
      'daily',
      page.scope,
      page.offset,
      page.limit,
      date,
      puzzleId,
    ),
  );
});

leaderboardApi.get('/training', async (context) => {
  const page = parameters((key) => context.req.query(key));
  if (!page) return context.json({ error: 'invalid_leaderboard' }, 400);
  return context.json(
    await readBoard(
      context.get('db'),
      context.get('accountId'),
      'training',
      page.scope,
      page.offset,
      page.limit,
    ),
  );
});

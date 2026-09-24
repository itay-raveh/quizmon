import { z } from 'zod';
import type {
  DailyLeaderboard,
  Leaderboard,
  LeaderboardScope,
} from '../../domain/social/leaderboards';
import { socialPlayerSchema } from '../../domain/social/friends';
import { accountSnapshot } from '../account/account';

const entry = z.object({
  player: socialPlayerSchema,
  rank: z.int().min(1),
  score: z.int().min(0),
  elapsedMilliseconds: z.int().min(0),
});
const leaderboardResponse = z.object({
  accountId: z.string(),
  date: z.string().optional(),
  scope: z.enum(['global', 'friends']),
  checkedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  total: z.int().min(0),
  items: z.array(entry),
  viewer: entry.nullable(),
  nextCursor: z
    .string()
    .regex(/^\d{1,9}$/)
    .nullable(),
});

export async function readDailyLeaderboard(
  owner: string,
  date: string,
  scope: LeaderboardScope,
  puzzleId: string,
  after: string | null,
  signal: AbortSignal,
): Promise<DailyLeaderboard> {
  return readLeaderboard(
    owner,
    'daily',
    date,
    scope,
    puzzleId,
    after,
    signal,
  ) as Promise<DailyLeaderboard>;
}

export async function readTrainingLeaderboard(
  owner: string,
  scope: LeaderboardScope,
  after: string | null,
  signal: AbortSignal,
): Promise<Leaderboard> {
  return readLeaderboard(
    owner,
    'training',
    undefined,
    scope,
    undefined,
    after,
    signal,
  );
}

async function readLeaderboard(
  owner: string,
  mode: 'daily' | 'training',
  date: string | undefined,
  scope: LeaderboardScope,
  puzzleId: string | undefined,
  after: string | null,
  signal: AbortSignal,
): Promise<Leaderboard> {
  const changed = 'Your account changed. Reopen the leaderboard.';
  if (accountSnapshot().owner !== owner) throw new Error(changed);
  const query = new URLSearchParams(date ? { date, scope } : { scope });
  if (puzzleId) query.set('puzzle', puzzleId);
  if (after) query.set('after', after);
  const response = await fetch(`/api/leaderboards/${mode}?${query}`, {
    credentials: 'same-origin',
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
  if (response.status === 401)
    throw new Error('Sign in again to view leaderboards.');
  if (response.status === 429)
    throw new Error('Too many requests. Wait a minute, then try again.');
  if (!response.ok) throw new Error('Leaderboards are unavailable. Try again.');
  const parsed = leaderboardResponse.safeParse(
    await response.json().catch(() => null),
  );
  if (accountSnapshot().owner !== owner) throw new Error(changed);
  if (!parsed.success)
    throw new Error(
      'The leaderboard returned an unreadable response. Try again.',
    );
  const value = parsed.data;
  if (
    value.accountId !== owner ||
    (mode === 'daily' ? value.date !== date : value.date !== undefined) ||
    value.scope !== scope
  )
    throw new Error(
      'The leaderboard returned an unreadable response. Try again.',
    );
  return value;
}

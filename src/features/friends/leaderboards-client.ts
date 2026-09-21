import type {
  DailyLeaderboard,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardScope,
} from '../../domain/social/leaderboards';
import { isRecord, isSafeNonnegativeInteger } from '../../lib/validation';
import { accountSnapshot } from '../account/account';

function entry(value: unknown): value is LeaderboardEntry {
  if (!isRecord(value) || !isRecord(value.player)) return false;
  const player = value.player;
  return (
    typeof player.id === 'string' &&
    typeof player.name === 'string' &&
    (player.code === null || typeof player.code === 'string') &&
    (player.partnerPokemon === null ||
      typeof player.partnerPokemon === 'string') &&
    isSafeNonnegativeInteger(value.rank) &&
    value.rank > 0 &&
    isSafeNonnegativeInteger(value.score) &&
    isSafeNonnegativeInteger(value.elapsedMilliseconds)
  );
}

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
  const value: unknown = await response.json().catch(() => null);
  if (accountSnapshot().owner !== owner) throw new Error(changed);
  if (
    !isRecord(value) ||
    value.accountId !== owner ||
    (mode === 'daily' ? value.date !== date : 'date' in value) ||
    value.scope !== scope ||
    typeof value.checkedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.checkedAt)) ||
    !isSafeNonnegativeInteger(value.total) ||
    !Array.isArray(value.items) ||
    !value.items.every(entry) ||
    !(value.viewer === null || entry(value.viewer)) ||
    !(
      value.nextCursor === null ||
      (typeof value.nextCursor === 'string' &&
        /^\d{1,9}$/.test(value.nextCursor))
    )
  )
    throw new Error(
      'The leaderboard returned an unreadable response. Try again.',
    );
  return {
    accountId: owner,
    ...(date ? { date } : {}),
    scope,
    checkedAt: value.checkedAt,
    total: value.total,
    items: value.items,
    viewer: value.viewer,
    nextCursor: value.nextCursor,
  };
}

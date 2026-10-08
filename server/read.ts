import type { Context } from 'hono';
import type { AccountEnv } from './api.ts';
import type {
  Leaderboard,
  LeaderboardScope,
} from '../src/domain/social/leaderboards.ts';
import type { SocialPlayer } from '../src/domain/social/friends.ts';
import type { TrainerProfile } from '../src/domain/player/trainer-profile.ts';
import { and, eq, or } from 'drizzle-orm';
import { friend } from './schema.ts';
import * as Sentry from '@sentry/cloudflare';

type ReadContext = Context<AccountEnv>;

export class SyncReadError extends Error {
  readonly status: number | 'network';

  constructor(status: number | 'network') {
    super('Sync read failed');
    this.status = status;
  }
}

export async function read<T>(
  context: ReadContext,
  path: string,
  body?: object,
): Promise<T> {
  const token = context.get('syncToken');
  for (let attempt = 0; attempt < 5; attempt++) {
    let response: Response;
    try {
      response = await Sentry.startSpan(
        {
          name: `sync.read.${path.split('/')[0]}`,
          op: 'http.client',
          attributes: { 'sync.attempt': attempt + 1 },
        },
        () =>
          fetch(`${context.get('sync').endpoint}/read/${path}`, {
            method: body ? 'POST' : 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              ...(body ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: AbortSignal.timeout(2_000),
          }),
      );
    } catch {
      if (attempt === 4) throw new SyncReadError('network');
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
      continue;
    }
    if (response.ok) return response.json() as Promise<T>;
    if (attempt === 4 || ![502, 503, 504].includes(response.status))
      throw new SyncReadError(response.status);
    await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
  }
  throw new SyncReadError('network');
}

export async function publicPlayers(
  context: ReadContext,
  ids: string[],
): Promise<SocialPlayer[]> {
  if (!ids.length) return [];
  const profiles = await read<
    { id: string; profile: TrainerProfile; leagueCompleted: boolean }[]
  >(context, 'players', { ids });
  return profiles.map(({ id, profile, leagueCompleted }) => ({
    id,
    name: profile.name.trim() || 'Trainer',
    partnerPokemon: profile.partnerPokemon,
    leagueCompleted,
  }));
}

export async function readTrainer(context: ReadContext, id: string) {
  const detail = await read<{
    player?: SocialPlayer;
    profile: TrainerProfile;
    stats: unknown;
    pokedex: unknown;
    record: unknown;
  }>(context, `trainer/${encodeURIComponent(id)}`);
  // Image reconciliation can finish after the Worker deploys.
  const player = detail.player ?? (await publicPlayers(context, [id]))[0];
  return player ? { ...detail, player } : null;
}

export async function readBoard(
  context: ReadContext,
  mode: 'daily' | 'training',
  scope: LeaderboardScope,
  offset: number,
  limit: number,
  day?: string,
): Promise<Leaderboard> {
  const viewerId = context.get('accountId');
  let visible: string[] | null = null;
  if (scope === 'friends') {
    const rows = await context
      .get('db')
      .select({ fromId: friend.fromId, toId: friend.toId })
      .from(friend)
      .where(
        and(
          eq(friend.status, 'accepted'),
          or(eq(friend.fromId, viewerId), eq(friend.toId, viewerId)),
        ),
      );
    visible = [
      viewerId,
      ...rows.map((row) => (row.fromId === viewerId ? row.toId : row.fromId)),
    ];
  }
  type Row = {
    playerId: string;
    rank: number | null;
    score: number;
    elapsedMilliseconds: number;
    ordinal: number;
    comparable: boolean;
  };
  const {
    total,
    page,
    viewer,
    players: profiles,
  } = await read<{
    total: number;
    page: Row[];
    viewer: Row | null;
    players?: {
      id: string;
      profile: TrainerProfile;
      leagueCompleted: boolean;
    }[];
  }>(context, 'board', {
    mode,
    visible,
    day,
    offset,
    limit,
  });
  const cards = profiles
    ? profiles.map(({ id, profile, leagueCompleted }) => ({
        id,
        name: profile.name.trim() || 'Trainer',
        partnerPokemon: profile.partnerPokemon,
        leagueCompleted,
      }))
    : await publicPlayers(context, [
        ...new Set(
          [...page, ...(viewer ? [viewer] : [])].map((row) => row.playerId),
        ),
      ]);
  const players = new Map(cards.map((player) => [player.id, player]));
  const entry = (row: Row) => ({
    player: players.get(row.playerId)!,
    rank: row.rank,
    score: row.score,
    elapsedMilliseconds: row.elapsedMilliseconds,
    comparable: row.comparable,
  });
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
}

export async function readProgressExport(context: ReadContext) {
  return read<unknown>(context, 'export');
}

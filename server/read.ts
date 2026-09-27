import { and, eq, inArray, or } from 'drizzle-orm';
import type { Context } from 'hono';
import type { AccountEnv } from './api.ts';
import type {
  Leaderboard,
  LeaderboardScope,
} from '../src/domain/social/leaderboards.ts';
import type { SocialPlayer } from '../src/domain/social/friends.ts';
import type { TrainerProfile } from '../src/domain/player/trainer-profile.ts';
import * as schema from './schema.ts';

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
  const { token } = await context.get('auth').api.getToken({
    headers: context.req.raw.headers,
  });
  for (let attempt = 0; attempt < 5; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${context.get('sync').endpoint}/read/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(2_000),
      });
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
  const rows = await context
    .get('db')
    .select({ id: schema.player.id, code: schema.player.code })
    .from(schema.player)
    .where(inArray(schema.player.id, ids));
  const codes = new Map(rows.map((row) => [row.id, row.code]));
  const profiles = await read<{ id: string; profile: TrainerProfile }[]>(
    context,
    'players',
    { ids: rows.map((row) => row.id) },
  );
  return profiles.map(({ id, profile }) => ({
    id,
    code: codes.get(id) ?? null,
    name: profile.name.trim() || 'Trainer',
    partnerPokemon: profile.partnerPokemon,
  }));
}

export async function readTrainer(context: ReadContext, id: string) {
  const [player] = await publicPlayers(context, [id]);
  if (!player) return null;
  const detail = await read<{
    profile: TrainerProfile;
    stats: unknown;
    pokedex: unknown;
    record: unknown;
  }>(context, `trainer/${encodeURIComponent(id)}`);
  return { player, ...detail };
}

export async function readBoard(
  context: ReadContext,
  mode: 'daily' | 'training',
  scope: LeaderboardScope,
  offset: number,
  limit: number,
  day?: string,
  puzzleId?: string,
  includeOther = false,
): Promise<Leaderboard> {
  const viewerId = context.get('accountId');
  let visible: string[] | null = null;
  if (scope === 'friends') {
    const rows = await context
      .get('db')
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
  const { total, page, viewer } = await read<{
    total: number;
    page: Row[];
    viewer: Row | null;
  }>(context, 'board', {
    mode,
    visible,
    day,
    puzzleId,
    includeOther,
    offset,
    limit,
  });
  const players = new Map(
    (
      await publicPlayers(context, [
        ...new Set(
          [...page, ...(viewer ? [viewer] : [])].map((row) => row.playerId),
        ),
      ])
    ).map((player) => [player.id, player]),
  );
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

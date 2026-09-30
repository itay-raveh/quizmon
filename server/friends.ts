import { and, asc, eq, gt, inArray, ne, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { user } from './auth-schema.ts';
import { friend } from './schema.ts';

export type FriendRequest = typeof friend.$inferSelect;
export type FriendAction = 'accept' | 'decline' | 'cancel' | 'remove';
export interface FriendPage {
  limit: number;
  after?: string;
}

export class FriendshipError extends Error {
  readonly code: string;
  readonly status: 400 | 403 | 404 | 409;
  constructor(code: string, status: 400 | 403 | 404 | 409) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export const isAccountId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

const involves = (accountId: string) =>
  or(eq(friend.fromId, accountId), eq(friend.toId, accountId));
const pair = (a: string, b: string) =>
  or(
    and(eq(friend.fromId, a), eq(friend.toId, b)),
    and(eq(friend.fromId, b), eq(friend.toId, a)),
  );

export function friendRequestView(row: FriendRequest, actor: string) {
  return {
    id: row.id,
    peerId: row.fromId === actor ? row.toId : row.fromId,
    direction: row.fromId === actor ? 'outgoing' : 'incoming',
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function sendFriendRequest(
  db: NodePgDatabase,
  actor: string,
  peer: string,
  id: string,
) {
  if (actor === peer) throw new FriendshipError('self_request', 400);
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, peer));
    if (!target) throw new FriendshipError('player_not_found', 404);
    const [created] = await tx
      .insert(friend)
      .values({ id, fromId: actor, toId: peer })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    const [retried] = await tx.select().from(friend).where(eq(friend.id, id));
    if (retried) {
      if (retried.fromId !== actor || retried.toId !== peer)
        throw new FriendshipError('request_id_conflict', 409);
      return retried;
    }
    const [active] = await tx
      .select()
      .from(friend)
      .where(
        and(pair(actor, peer), inArray(friend.status, ['pending', 'accepted'])),
      );
    if (!active) throw new FriendshipError('relationship_changed', 409);
    return active;
  });
}

export async function changeFriendRequest(
  db: NodePgDatabase,
  actor: string,
  id: string,
  action: FriendAction,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(friend)
      .where(and(eq(friend.id, id), involves(actor)))
      .for('update');
    if (!current) throw new FriendshipError('request_not_found', 404);
    if (
      (action === 'accept' || action === 'decline') &&
      current.fromId === actor
    )
      throw new FriendshipError('request_not_found', 404);
    if (action === 'cancel' && current.fromId !== actor)
      throw new FriendshipError('request_not_found', 404);
    const next = {
      accept: 'accepted',
      decline: 'declined',
      cancel: 'cancelled',
      remove: 'removed',
    } as const;
    if (current.status === next[action]) return current;
    if (current.status !== (action === 'remove' ? 'accepted' : 'pending'))
      throw new FriendshipError('relationship_changed', 409);
    const [updated] = await tx
      .update(friend)
      .set({ status: next[action], updatedAt: new Date() })
      .where(eq(friend.id, current.id))
      .returning();
    if (!updated) throw new FriendshipError('request_not_found', 404);
    return updated;
  });
}

export async function listFriendRequests(
  db: NodePgDatabase,
  actor: string,
  view: 'friends' | 'incoming' | 'outgoing',
  page: FriendPage,
) {
  const rows = await db
    .select()
    .from(friend)
    .where(
      and(
        involves(actor),
        eq(friend.status, view === 'friends' ? 'accepted' : 'pending'),
        view === 'incoming'
          ? ne(friend.fromId, actor)
          : view === 'outgoing'
            ? eq(friend.fromId, actor)
            : undefined,
        page.after ? gt(friend.id, page.after) : undefined,
      ),
    )
    .orderBy(asc(friend.id))
    .limit(page.limit + 1);
  const items = rows
    .slice(0, page.limit)
    .map((row) => friendRequestView(row, actor));
  return {
    accountId: actor,
    items,
    nextCursor: rows.length > page.limit ? items.at(-1)!.id : null,
  };
}

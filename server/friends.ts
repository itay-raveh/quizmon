import { and, asc, eq, gt, inArray, ne, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { user } from './auth-schema.ts';
import { friendRequests } from './friend-schema.ts';

export type FriendRequest = typeof friendRequests.$inferSelect;
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
  or(
    eq(friendRequests.userLow, accountId),
    eq(friendRequests.userHigh, accountId),
  );

export function friendRequestView(row: FriendRequest, actor: string) {
  return {
    id: row.id,
    peerId: row.userLow === actor ? row.userHigh : row.userLow,
    direction: row.senderId === actor ? 'outgoing' : 'incoming',
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
  const [userLow, userHigh] = actor < peer ? [actor, peer] : [peer, actor];
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, peer));
    if (!target) throw new FriendshipError('player_not_found', 404);
    const [created] = await tx
      .insert(friendRequests)
      .values({ id, userLow, userHigh, senderId: actor })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    const [retried] = await tx
      .select()
      .from(friendRequests)
      .where(eq(friendRequests.id, id));
    if (retried) {
      if (
        retried.senderId !== actor ||
        retried.userLow !== userLow ||
        retried.userHigh !== userHigh
      )
        throw new FriendshipError('request_id_conflict', 409);
      return retried;
    }
    const [active] = await tx
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.userLow, userLow),
          eq(friendRequests.userHigh, userHigh),
          inArray(friendRequests.status, ['pending', 'accepted']),
        ),
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
      .from(friendRequests)
      .where(and(eq(friendRequests.id, id), involves(actor)))
      .for('update');
    if (!current) throw new FriendshipError('request_not_found', 404);
    if (
      (action === 'accept' || action === 'decline') &&
      current.senderId === actor
    )
      throw new FriendshipError('request_not_found', 404);
    if (action === 'cancel' && current.senderId !== actor)
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
    // Closed request IDs remain retry receipts and cannot affect a later request.
    const [updated] = await tx
      .update(friendRequests)
      .set({ status: next[action], updatedAt: new Date() })
      .where(eq(friendRequests.id, current.id))
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
    .from(friendRequests)
    .where(
      and(
        involves(actor),
        eq(friendRequests.status, view === 'friends' ? 'accepted' : 'pending'),
        view === 'incoming'
          ? ne(friendRequests.senderId, actor)
          : view === 'outgoing'
            ? eq(friendRequests.senderId, actor)
            : undefined,
        page.after ? gt(friendRequests.id, page.after) : undefined,
      ),
    )
    .orderBy(asc(friendRequests.id))
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

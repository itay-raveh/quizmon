import { MongoServerError, type Db } from 'mongodb';

export interface FriendRequest {
  _id: string;
  fromId: string;
  toId: string;
  pairKey: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'removed';
  createdAt: Date;
  updatedAt: Date;
}

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

export const friendCollection = (db: Db) =>
  db.collection<FriendRequest>('friend');
const pairKey = (a: string, b: string) => [a, b].sort().join('/');
const active = ['pending', 'accepted'] as const;

export function friendRequestView(row: FriendRequest, actor: string) {
  return {
    id: row._id,
    peerId: row.fromId === actor ? row.toId : row.fromId,
    direction: row.fromId === actor ? 'outgoing' : 'incoming',
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function sendFriendRequest(
  db: Db,
  actor: string,
  peer: string,
  id: string,
) {
  if (actor === peer) throw new FriendshipError('self_request', 400);
  if (
    !(await db
      .collection<{ _id: string }>('user')
      .findOne({ _id: peer }, { projection: { _id: 1 } }))
  )
    throw new FriendshipError('player_not_found', 404);
  const friend = friendCollection(db);
  const now = new Date();
  const row: FriendRequest = {
    _id: id,
    fromId: actor,
    toId: peer,
    pairKey: pairKey(actor, peer),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  try {
    await friend.insertOne(row);
    return row;
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== 11000)
      throw error;
    const retried = await friend.findOne({ _id: id });
    if (retried) {
      if (retried.fromId !== actor || retried.toId !== peer)
        throw new FriendshipError('request_id_conflict', 409);
      return retried;
    }
    const existing = await friend.findOne({
      pairKey: row.pairKey,
      status: { $in: [...active] },
    });
    if (existing) return existing;
    throw new FriendshipError('relationship_changed', 409);
  }
}

export async function changeFriendRequest(
  db: Db,
  actor: string,
  id: string,
  action: FriendAction,
) {
  const friend = friendCollection(db);
  const current = await friend.findOne({
    _id: id,
    $or: [{ fromId: actor }, { toId: actor }],
  });
  if (!current) throw new FriendshipError('request_not_found', 404);
  if (
    ((action === 'accept' || action === 'decline') &&
      current.fromId === actor) ||
    (action === 'cancel' && current.fromId !== actor)
  )
    throw new FriendshipError('request_not_found', 404);
  const next = {
    accept: 'accepted',
    decline: 'declined',
    cancel: 'cancelled',
    remove: 'removed',
  } as const;
  if (current.status === next[action]) return current;
  const expected = action === 'remove' ? 'accepted' : 'pending';
  if (current.status !== expected)
    throw new FriendshipError('relationship_changed', 409);
  const updated = await friend.findOneAndUpdate(
    { _id: id, status: expected },
    { $set: { status: next[action], updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!updated) throw new FriendshipError('relationship_changed', 409);
  return updated;
}

export async function listFriendRequests(
  db: Db,
  actor: string,
  view: 'friends' | 'incoming' | 'outgoing',
  page: FriendPage,
) {
  const rows = await friendCollection(db)
    .find({
      status: view === 'friends' ? 'accepted' : 'pending',
      ...(view === 'incoming'
        ? { toId: actor }
        : view === 'outgoing'
          ? { fromId: actor }
          : { $or: [{ fromId: actor }, { toId: actor }] }),
      ...(page.after ? { _id: { $gt: page.after } } : {}),
    })
    .sort({ _id: 1 })
    .limit(page.limit + 1)
    .toArray();
  const items = rows
    .slice(0, page.limit)
    .map((row) => friendRequestView(row, actor));
  return {
    accountId: actor,
    items,
    nextCursor: rows.length > page.limit ? items.at(-1)!.id : null,
  };
}

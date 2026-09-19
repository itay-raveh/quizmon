import { Hono, type Context } from 'hono';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { normalizeFriendCode } from '../src/domain/social/friends.ts';
import {
  lookupSocialPlayer,
  ownSocialPlayer,
  publicPlayers,
} from './friend-identity.ts';
import { isRecord } from '../src/lib/validation.ts';
import { uuid } from '../src/domain/sync/progress.ts';
import {
  changeFriendRequest,
  friendRequestView,
  FriendshipError,
  isAccountId,
  listFriendRequests,
  sendFriendRequest,
  type FriendPage,
} from './friends.ts';

interface FriendshipEnv {
  Bindings: { db: NodePgDatabase; accountId: string; origin: string };
}

async function body(context: Context<FriendshipEnv>) {
  let value: unknown;
  try {
    value = await context.req.json();
  } catch {
    throw new FriendshipError('invalid_json', 400);
  }
  if (!isRecord(value)) throw new FriendshipError('invalid_request', 400);
  if (value.expectedAccountId !== context.env.accountId)
    throw new FriendshipError('account_changed', 403);
  return value;
}

function page(context: Context<FriendshipEnv>): FriendPage {
  const limit = context.req.query('limit');
  const after = context.req.query('after');
  if (
    limit !== undefined &&
    (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100)
  )
    throw new FriendshipError('invalid_page', 400);
  if (after !== undefined && !uuid(after))
    throw new FriendshipError('invalid_page', 400);
  return {
    limit: limit === undefined ? 50 : Number(limit),
    ...(after ? { after: after.toLowerCase() } : {}),
  };
}

export const friendshipApi = new Hono<FriendshipEnv>();
friendshipApi.use('*', async (context, next) => {
  context.header('Cache-Control', 'no-store');
  if (
    context.req.method !== 'GET' &&
    context.req.header('Origin') !== context.env.origin
  )
    throw new FriendshipError('invalid_origin', 403);
  await next();
});
friendshipApi.onError((error, context) => {
  if (error instanceof FriendshipError)
    return context.json({ error: error.code }, error.status);
  throw error;
});
async function list(
  context: Context<FriendshipEnv>,
  view: 'friends' | 'incoming' | 'outgoing',
) {
  const result = await listFriendRequests(
    context.env.db,
    context.env.accountId,
    view,
    page(context),
  );
  return context.json({
    ...result,
    players: await publicPlayers(
      context.env.db,
      result.items.map((item) => item.peerId),
    ),
  });
}
friendshipApi.post('/api/friends/identity', async (context) => {
  await body(context);
  return context.json({
    accountId: context.env.accountId,
    player: await ownSocialPlayer(context.env.db, context.env.accountId),
  });
});
friendshipApi.get('/api/friends/player/:code', async (context) => {
  const code = normalizeFriendCode(context.req.param('code'));
  if (!code) throw new FriendshipError('invalid_code', 400);
  return context.json(
    await lookupSocialPlayer(context.env.db, context.env.accountId, code),
  );
});
friendshipApi.get('/api/friends', (context) => list(context, 'friends'));
friendshipApi.get('/api/friends/requests', async (context) => {
  const direction = context.req.query('direction') ?? 'incoming';
  if (direction !== 'incoming' && direction !== 'outgoing')
    throw new FriendshipError('invalid_direction', 400);
  return list(context, direction);
});
friendshipApi.post('/api/friends/requests', async (context) => {
  const value = await body(context);
  if (!isAccountId(value.peerId) || !uuid(value.requestId))
    throw new FriendshipError('invalid_request', 400);
  const request = await sendFriendRequest(
    context.env.db,
    context.env.accountId,
    value.peerId,
    value.requestId.toLowerCase(),
  );
  return context.json({
    accountId: context.env.accountId,
    request: friendRequestView(request, context.env.accountId),
  });
});
for (const action of ['accept', 'decline', 'cancel', 'remove'] as const) {
  const path =
    action === 'remove'
      ? '/api/friends/:id/remove'
      : `/api/friends/requests/:id/${action}`;
  friendshipApi.post(path, async (context) => {
    await body(context);
    const id = context.req.param('id');
    if (!uuid(id)) throw new FriendshipError('invalid_request', 400);
    const request = await changeFriendRequest(
      context.env.db,
      context.env.accountId,
      id.toLowerCase(),
      action,
    );
    return context.json({
      accountId: context.env.accountId,
      request: friendRequestView(request, context.env.accountId),
    });
  });
}

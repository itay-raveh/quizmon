import type { AccountEnv } from './api.ts';
import { Hono, type Context } from 'hono';
import { normalizeFriendCode } from '../src/domain/social/friends.ts';
import { lookupSocialPlayer, ownSocialPlayer } from './friend-identity.ts';
import { publicPlayers } from './read.ts';
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

async function body(context: Context<AccountEnv>) {
  let value: unknown;
  try {
    value = await context.req.json();
  } catch {
    throw new FriendshipError('invalid_json', 400);
  }
  if (!isRecord(value)) throw new FriendshipError('invalid_request', 400);
  if (value.expectedAccountId !== context.get('accountId'))
    throw new FriendshipError('account_changed', 403);
  return value;
}

function page(context: Context<AccountEnv>): FriendPage {
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

export const friendshipApi = new Hono<AccountEnv>();
friendshipApi.use('*', async (context, next) => {
  context.header('Cache-Control', 'no-store');
  if (
    context.req.method !== 'GET' &&
    context.req.header('Origin') !== context.get('origin')
  )
    throw new FriendshipError('invalid_origin', 403);
  await next();
});
async function list(
  context: Context<AccountEnv>,
  view: 'friends' | 'incoming' | 'outgoing',
) {
  const result = await listFriendRequests(
    context.get('db'),
    context.get('accountId'),
    view,
    page(context),
  );
  return context.json({
    ...result,
    players: await publicPlayers(
      context.get('db'),
      result.items.map((item) => item.peerId),
    ),
  });
}
friendshipApi.post('/identity', async (context) => {
  await body(context);
  return context.json({
    accountId: context.get('accountId'),
    player: await ownSocialPlayer(context.get('db'), context.get('accountId')),
  });
});
friendshipApi.get('/player/:code', async (context) => {
  const code = normalizeFriendCode(context.req.param('code'));
  if (!code) throw new FriendshipError('invalid_code', 400);
  return context.json(
    await lookupSocialPlayer(context.get('db'), context.get('accountId'), code),
  );
});
friendshipApi.get('/', (context) => list(context, 'friends'));
friendshipApi.get('/requests', async (context) => {
  const direction = context.req.query('direction') ?? 'incoming';
  if (direction !== 'incoming' && direction !== 'outgoing')
    throw new FriendshipError('invalid_direction', 400);
  return list(context, direction);
});
friendshipApi.post('/requests', async (context) => {
  const value = await body(context);
  if (!isAccountId(value.peerId) || !uuid(value.requestId))
    throw new FriendshipError('invalid_request', 400);
  const request = await sendFriendRequest(
    context.get('db'),
    context.get('accountId'),
    value.peerId,
    value.requestId.toLowerCase(),
  );
  return context.json({
    accountId: context.get('accountId'),
    request: friendRequestView(request, context.get('accountId')),
  });
});
for (const action of ['accept', 'decline', 'cancel', 'remove'] as const) {
  const path = action === 'remove' ? '/:id/remove' : `/requests/:id/${action}`;
  friendshipApi.post(path, async (context) => {
    await body(context);
    const id = context.req.param('id');
    if (!uuid(id)) throw new FriendshipError('invalid_request', 400);
    const request = await changeFriendRequest(
      context.get('db'),
      context.get('accountId'),
      id.toLowerCase(),
      action,
    );
    return context.json({
      accountId: context.get('accountId'),
      request: friendRequestView(request, context.get('accountId')),
    });
  });
}

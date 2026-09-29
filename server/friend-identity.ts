import type { Context } from 'hono';
import {
  friendCollection,
  friendRequestView,
  FriendshipError,
} from './friends.ts';
import { publicPlayers } from './read.ts';
import type { AccountEnv } from './api.ts';

export async function ownSocialPlayer(context: Context<AccountEnv>) {
  return (await publicPlayers(context, [context.get('accountId')]))[0]!;
}

export async function lookupSocialPlayer(
  context: Context<AccountEnv>,
  actor: string,
  peer: string,
) {
  const [publicPlayer] = await publicPlayers(context, [peer]);
  if (!publicPlayer) throw new FriendshipError('player_not_found', 404);
  const pairKey = [actor, peer].sort().join('/');
  const request = await friendCollection(context.get('db')).findOne({
    pairKey,
    status: { $in: ['pending', 'accepted'] },
  });
  return {
    accountId: actor,
    player: publicPlayer,
    request: request ? friendRequestView(request, actor) : null,
  };
}

import type { Context } from 'hono';
import { friendRequestView, FriendshipError } from './friends.ts';
import { publicPlayers } from './read.ts';
import type { AccountEnv } from './api.ts';
import { and, eq, inArray, or } from 'drizzle-orm';
import { friend } from './schema.ts';

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
  const [request] = await context
    .get('db')
    .select()
    .from(friend)
    .where(
      and(
        inArray(friend.status, ['pending', 'accepted']),
        or(
          and(eq(friend.fromId, actor), eq(friend.toId, peer)),
          and(eq(friend.fromId, peer), eq(friend.toId, actor)),
        ),
      ),
    );
  return {
    accountId: actor,
    player: publicPlayer,
    request: request ? friendRequestView(request, actor) : null,
  };
}

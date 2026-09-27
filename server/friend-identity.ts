import { and, eq, inArray, or } from 'drizzle-orm';
import type { Context } from 'hono';
import { friend, player } from './schema.ts';
import { publicPlayers } from './read.ts';
import { friendRequestView, FriendshipError } from './friends.ts';
import type { AccountEnv } from './api.ts';

export async function bootstrapSocialIdentity(context: Context<AccountEnv>) {
  const db = context.get('db');
  const actor = context.get('accountId');
  for (let attempt = 0; attempt < 4; attempt++) {
    const [existing] = await db
      .select()
      .from(player)
      .where(eq(player.id, actor));
    if (existing) return existing;
    const code = [...crypto.getRandomValues(new Uint8Array(8))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    await db.insert(player).values({ id: actor, code }).onConflictDoNothing();
  }
  throw new Error('Could not create friend identity.');
}

export async function ownSocialPlayer(context: Context<AccountEnv>) {
  await bootstrapSocialIdentity(context);
  return (await publicPlayers(context, [context.get('accountId')]))[0]!;
}

export async function lookupSocialPlayer(
  context: Context<AccountEnv>,
  actor: string,
  code: string,
) {
  const db = context.get('db');
  const [identity] = await db
    .select({ id: player.id })
    .from(player)
    .where(eq(player.code, code));
  if (!identity) throw new FriendshipError('player_not_found', 404);
  const [publicPlayer] = await publicPlayers(context, [identity.id]);
  if (!publicPlayer) throw new FriendshipError('player_not_found', 404);
  const [request] = await db
    .select()
    .from(friend)
    .where(
      and(
        inArray(friend.status, ['pending', 'accepted']),
        or(
          and(eq(friend.fromId, actor), eq(friend.toId, publicPlayer.id)),
          and(eq(friend.fromId, publicPlayer.id), eq(friend.toId, actor)),
        ),
      ),
    );
  return {
    accountId: actor,
    player: publicPlayer,
    request: request ? friendRequestView(request, actor) : null,
  };
}

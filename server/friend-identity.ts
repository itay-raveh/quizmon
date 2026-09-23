import { and, eq, inArray, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { friend, player } from './target-schema.ts';
import { targetBootstrap } from './target-progress-api.ts';
import { publicPlayers } from './target-read.ts';
import { friendRequestView, FriendshipError } from './friends.ts';

export { publicPlayers } from './target-read.ts';

export async function ownSocialPlayer(db: NodePgDatabase, actor: string) {
  await targetBootstrap(db, actor);
  return (await publicPlayers(db, [actor]))[0]!;
}

export async function lookupSocialPlayer(
  db: NodePgDatabase,
  actor: string,
  code: string,
) {
  const [identity] = await db
    .select({ id: player.id })
    .from(player)
    .where(eq(player.code, code));
  if (!identity) throw new FriendshipError('player_not_found', 404);
  const [publicPlayer] = await publicPlayers(db, [identity.id]);
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

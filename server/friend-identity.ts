import { and, eq, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { SocialPlayer } from '../src/domain/social/friends.ts';
import { user } from './auth-schema.ts';
import { friendRequests, socialPlayers } from './friend-schema.ts';
import { friendRequestView, FriendshipError } from './friends.ts';
import { accountState } from './progress-schema.ts';

export async function publicPlayers(
  db: NodePgDatabase,
  ids: string[],
): Promise<SocialPlayer[]> {
  if (ids.length === 0) return [];
  return db
    .select({
      id: user.id,
      code: socialPlayers.code,
      name: sql<string>`COALESCE(NULLIF(BTRIM(${accountState.edits}->>'name'), ''), 'Trainer')`,
      partnerPokemon: sql<
        string | null
      >`${accountState.edits}->>'partnerPokemon'`,
    })
    .from(user)
    .leftJoin(socialPlayers, eq(socialPlayers.id, user.id))
    .leftJoin(accountState, eq(accountState.id, user.id))
    .where(inArray(user.id, ids));
}

export async function ownSocialPlayer(db: NodePgDatabase, actor: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const [existing] = await db
      .select()
      .from(socialPlayers)
      .where(eq(socialPlayers.id, actor));
    if (existing) return (await publicPlayers(db, [actor]))[0]!;
    const code = [...crypto.getRandomValues(new Uint8Array(8))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    await db
      .insert(socialPlayers)
      .values({ id: actor, code })
      .onConflictDoNothing();
  }
  throw new FriendshipError('identity_retry', 409);
}

export async function lookupSocialPlayer(
  db: NodePgDatabase,
  actor: string,
  code: string,
) {
  const [identity] = await db
    .select()
    .from(socialPlayers)
    .where(eq(socialPlayers.code, code));
  if (!identity) throw new FriendshipError('player_not_found', 404);
  const [player] = await publicPlayers(db, [identity.id]);
  if (!player) throw new FriendshipError('player_not_found', 404);
  const [userLow, userHigh] =
    actor < player.id ? [actor, player.id] : [player.id, actor];
  const [request] = await db
    .select()
    .from(friendRequests)
    .where(
      and(
        inArray(friendRequests.status, ['pending', 'accepted']),
        eq(friendRequests.userLow, userLow),
        eq(friendRequests.userHigh, userHigh),
      ),
    );
  return {
    accountId: actor,
    player,
    request: request ? friendRequestView(request, actor) : null,
  };
}

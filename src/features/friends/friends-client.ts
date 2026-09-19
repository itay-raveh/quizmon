import { isRecord } from '../../lib/validation';
import type { FriendRelation, SocialPlayer } from '../../domain/social/friends';
import { accountSnapshot } from '../account/account';

export interface FriendsPage {
  items: FriendRelation[];
  players: SocialPlayer[];
  nextCursor: string | null;
}
export interface PlayerLookup {
  player: SocialPlayer;
  request: FriendRelation | null;
}

const messages: Record<string, string> = {
  player_not_found:
    'No player has that friend code. Check the code and try again.',
  invalid_code: 'Enter the full friend code or a Quizmon friend link.',
  account_changed: 'Your account changed. Close Friends and sign in again.',
  self_request: 'This is your own friend code.',
  request_not_found:
    'This request is no longer available. Refresh your friends.',
  relationship_changed:
    'This request changed. Refresh your friends before trying again.',
};

async function request(
  owner: string,
  path: string,
  body?: Record<string, unknown>,
  signal?: AbortSignal,
) {
  if (accountSnapshot().owner !== owner)
    throw new Error(messages.account_changed);
  const response = await fetch(`/api/friends${path}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...(body
      ? { body: JSON.stringify({ ...body, expectedAccountId: owner }) }
      : {}),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
  });
  if (response.status === 401) throw new Error('Sign in again to use Friends.');
  if (response.status === 429)
    throw new Error('Too many requests. Wait a minute, then try again.');
  if (!response.headers.get('Content-Type')?.includes('application/json'))
    throw new Error('Friends is unavailable. Reconnect and try again.');
  const value: unknown = await response.json();
  if (!isRecord(value))
    throw new Error('Friends returned an invalid response.');
  if (!response.ok)
    throw new Error(
      messages[String(value.error)] ??
        'Friends is unavailable. Please try again.',
    );
  if (accountSnapshot().owner !== owner || value.accountId !== owner)
    throw new Error(messages.account_changed);
  return value;
}

function player(value: unknown): SocialPlayer {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !(value.code === null || typeof value.code === 'string') ||
    !(value.partnerPokemon === null || typeof value.partnerPokemon === 'string')
  )
    throw new Error('Friends returned an invalid player.');
  return {
    id: value.id,
    name: value.name,
    code: value.code,
    partnerPokemon: value.partnerPokemon,
  };
}

function relation(value: unknown): FriendRelation {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.peerId !== 'string' ||
    (value.direction !== 'incoming' && value.direction !== 'outgoing') ||
    (value.status !== 'pending' &&
      value.status !== 'accepted' &&
      value.status !== 'declined' &&
      value.status !== 'cancelled' &&
      value.status !== 'removed') ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  )
    throw new Error('Friends returned an invalid request.');
  return {
    id: value.id,
    peerId: value.peerId,
    direction: value.direction,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export async function ownPlayer(owner: string, signal?: AbortSignal) {
  return player((await request(owner, '/identity', {}, signal)).player);
}

export async function friendPage(
  owner: string,
  view: 'friends' | 'incoming' | 'outgoing',
  after?: string,
  signal?: AbortSignal,
): Promise<FriendsPage> {
  const query = new URLSearchParams(
    view === 'friends' ? {} : { direction: view },
  );
  if (after) query.set('after', after);
  const value = await request(
    owner,
    `${view === 'friends' ? '' : '/requests'}?${query}`,
    undefined,
    signal,
  );
  if (
    !Array.isArray(value.items) ||
    !Array.isArray(value.players) ||
    !(value.nextCursor === null || typeof value.nextCursor === 'string')
  )
    throw new Error('Friends returned an invalid list.');
  return {
    items: value.items.map(relation),
    players: value.players.map(player),
    nextCursor: value.nextCursor,
  };
}

export async function lookupPlayer(
  owner: string,
  code: string,
  signal?: AbortSignal,
): Promise<PlayerLookup> {
  const value = await request(
    owner,
    `/player/${encodeURIComponent(code)}`,
    undefined,
    signal,
  );
  return {
    player: player(value.player),
    request: value.request === null ? null : relation(value.request),
  };
}

export async function sendRequest(
  owner: string,
  peerId: string,
  requestId: string,
) {
  return relation(
    (await request(owner, '/requests', { peerId, requestId })).request,
  );
}

export async function changeRequest(
  owner: string,
  id: string,
  action: 'accept' | 'decline' | 'cancel' | 'remove',
) {
  return relation(
    (
      await request(
        owner,
        action === 'remove' ? `/${id}/remove` : `/requests/${id}/${action}`,
        {},
      )
    ).request,
  );
}

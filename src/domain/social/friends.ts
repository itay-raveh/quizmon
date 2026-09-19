export interface SocialPlayer {
  id: string;
  code: string | null;
  name: string;
  partnerPokemon: string | null;
}

export interface FriendRelation {
  id: string;
  peerId: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'removed';
  createdAt: string;
  updatedAt: string;
}

export function normalizeFriendCode(value: string) {
  const code = value
    .trim()
    .replaceAll('-', '')
    .replaceAll(' ', '')
    .toUpperCase();
  return /^[A-F0-9]{16}$/.test(code) ? code : null;
}

export const formatFriendCode = (code: string) =>
  code.match(/.{1,4}/g)?.join('-') ?? code;

export function parseFriendInput(value: string, origin: string) {
  const code = normalizeFriendCode(value);
  if (code) return code;
  try {
    const url = new URL(value);
    if (url.origin !== origin || url.pathname !== '/') return null;
    return normalizeFriendCode(
      new URLSearchParams(url.hash.slice(1)).get('friend') ?? '',
    );
  } catch {
    return null;
  }
}

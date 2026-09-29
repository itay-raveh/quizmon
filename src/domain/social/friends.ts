import { z } from 'zod';

export const socialPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  partnerPokemon: z.string().nullable(),
});

export type SocialPlayer = z.infer<typeof socialPlayerSchema>;

export interface FriendRelation {
  id: string;
  peerId: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'removed';
  createdAt: string;
  updatedAt: string;
}

export const friendInvitePath = (id: string) =>
  `/account/friends?id=${encodeURIComponent(id)}`;

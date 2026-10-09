import type { CompactRound } from '../../domain/sync/compact-rounds';
import type { GameSettings } from '../../domain/settings/types';
import type { TrainerProfile } from '../../domain/player/trainer-profile';

export interface SyncedPlayer {
  id: string;
  profile: TrainerProfile;
  settings: GameSettings | null;
}

export type SyncedRound = CompactRound & { ownerId: string };

export interface DeviceRecord {
  id: string;
  payload: object;
}

const identity = {
  id: { type: 'string', maxLength: 128 },
} as const;

export const playerSchema = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...identity,
    profile: { type: 'object', additionalProperties: true },
    settings: { type: ['object', 'null'], additionalProperties: true },
  },
  required: ['id', 'profile', 'settings'],
} as const;

export const roundSchema = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  indexes: [['ownerId', 'completedAt', 'id']],
  properties: {
    ...identity,
    ownerId: { type: 'string', maxLength: 128 },
    mode: { type: 'string', enum: ['training', 'daily', 'league'] },
    completedAt: { type: 'string', maxLength: 24 },
    day: { type: 'string' },
    training: { type: 'object', additionalProperties: true },
    answers: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
    },
  },
  required: ['id', 'ownerId', 'mode', 'completedAt', 'answers'],
} as const;

export const deviceSchema = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: identity.id,
    payload: { type: 'object', additionalProperties: true },
  },
  required: ['id', 'payload'],
} as const;

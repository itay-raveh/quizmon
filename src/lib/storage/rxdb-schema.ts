import type { CompactRound } from '../../domain/sync/compact-rounds';
import type { GameSettings } from '../../domain/settings/types';
import type { TrainerProfile } from '../../domain/player/trainer-profile';
import { z } from 'zod';
import { dailyDateSchema, uuidSchema } from '../validation.ts';

export interface SyncedPlayer {
  id: string;
  profile: TrainerProfile;
  settings: GameSettings | null;
}

export type SyncedRound = CompactRound & { ownerId: string };

export interface DailyReceipt {
  id: string;
  ownerId: string;
  day: string;
  roundId: string;
}

export const dailyReceiptId = (ownerId: string, day: string) =>
  `${ownerId}/${day}`;

export const dailyReceiptDocumentSchema = z
  .object({
    id: z.string(),
    ownerId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    day: dailyDateSchema,
    roundId: uuidSchema,
  })
  .refine(({ id, ownerId, day }) => id === dailyReceiptId(ownerId, day));

export interface DeviceRecord {
  id: string;
  payload: object;
}

const identity = {
  id: { type: 'string', maxLength: 128 },
} as const;

export const playerSchema = {
  version: 0,
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
  version: 0,
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
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: identity.id,
    payload: { type: 'object', additionalProperties: true },
  },
  required: ['id', 'payload'],
} as const;

export const dailyReceiptSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  indexes: [['ownerId', 'day']],
  properties: {
    id: { type: 'string', maxLength: 140 },
    ownerId: identity.id,
    day: { type: 'string', maxLength: 10 },
    roundId: identity.id,
  },
  required: ['id', 'ownerId', 'day', 'roundId'],
} as const;

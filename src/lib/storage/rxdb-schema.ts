import type { RoundFact } from '../../domain/sync/round-facts';
import type { GameSettings } from '../../domain/settings/types';
import type { TrainerProfile } from '../../domain/player/trainer-profile';

export interface SyncedPlayer {
  id: string;
  ownerId: string;
  profile: TrainerProfile;
  settings: GameSettings | null;
}

export interface SyncedRound {
  id: string;
  ownerId: string;
  fact: RoundFact;
}

export interface DeviceRecord {
  id: string;
  payload: object;
}

const identity = {
  id: { type: 'string', maxLength: 128 },
  ownerId: { type: 'string', maxLength: 128 },
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
  required: ['id', 'ownerId', 'profile', 'settings'],
} as const;

export const roundSchema = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...identity,
    fact: { type: 'object', additionalProperties: true },
  },
  required: ['id', 'ownerId', 'fact'],
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

const manualCutoffRequired = (): never => {
  throw new Error(
    'The version-0 database requires the manual question-ID cutoff.',
  );
};

export const migrations = {
  players: { 1: manualCutoffRequired },
  rounds: { 1: manualCutoffRequired },
  device: { 1: manualCutoffRequired },
};

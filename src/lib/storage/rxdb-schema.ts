import type { RoundFact } from '../../domain/sync/round-facts';
import type { GameSettings } from '../../domain/settings/types';
import type { TrainerProfile } from '../../domain/player/trainer-profile';
import { parseRound } from '../../domain/player/schemas/round.ts';
import { validateRoundFact } from '../../domain/sync/round-facts.ts';
import { migrateQuestionTypes } from './question-type-migration.ts';
import { isRecord } from '../validation.ts';

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

export const migrations = {
  players: { 1: migrateQuestionTypes },
  rounds: {
    1: (old: SyncedRound) => {
      const migrated = migrateQuestionTypes(old) as SyncedRound;
      return validateRoundFact(migrated.fact) ? migrated : null;
    },
  },
  device: {
    1: (old: DeviceRecord) => {
      const migrated = migrateQuestionTypes(old) as DeviceRecord;
      if (old.id.startsWith('round:'))
        return parseRound(migrated.payload) ? migrated : null;
      if (old.id !== 'state' || !isRecord(migrated.payload)) return migrated;
      const attempts = migrated.payload.dailyAttempts;
      return {
        ...migrated,
        payload: {
          ...migrated.payload,
          dailyAttempts: isRecord(attempts)
            ? Object.fromEntries(
                Object.entries(attempts).filter(([, round]) =>
                  Boolean(parseRound(round)),
                ),
              )
            : {},
        },
      };
    },
  },
};

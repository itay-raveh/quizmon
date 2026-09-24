import {
  parsePlayerSave,
  type PlayerSave,
} from '../../domain/player/player-save.ts';
import { isRecord, isUuid } from '../validation.ts';

export interface LegacyLocalPlayerState {
  version: 1;
  datasetId: string;
  save: PlayerSave;
  dailyAttempts: Record<string, unknown>;
  account?: { id: string; generationId: string; serverEpoch: string };
}

export function parseLegacyLocalPlayerState(
  value: unknown,
): LegacyLocalPlayerState {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isUuid(value.datasetId) ||
    (value.account !== undefined &&
      (!isRecord(value.account) ||
        typeof value.account.id !== 'string' ||
        !isUuid(value.account.generationId) ||
        !isUuid(value.account.serverEpoch)))
  )
    throw new Error(
      'The old browser save cannot be read. Download a recovery export.',
    );
  return {
    version: 1,
    datasetId: value.datasetId,
    save: parsePlayerSave(value.save),
    dailyAttempts: isRecord(value.dailyAttempts) ? value.dailyAttempts : {},
    ...(isRecord(value.account)
      ? {
          account: {
            id: value.account.id as string,
            generationId: value.account.generationId as string,
            serverEpoch: value.account.serverEpoch as string,
          },
        }
      : {}),
  };
}

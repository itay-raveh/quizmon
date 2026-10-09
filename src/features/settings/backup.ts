import { z } from 'zod';
import {
  projectCompactRoundHistory,
  recentQuestionHistory,
} from '../../domain/player/compact-history';
import {
  emptyPlayerData,
  type PlayerData,
} from '../../domain/player/player-save';
import {
  parsePlayerData,
  savedSettingsSchema,
} from '../../domain/player/schemas/player-data';
import { trainerProfileSchema } from '../../domain/player/trainer-profile';
import { parseRound } from '../../domain/player/schemas/round';
import { completeRound } from '../../domain/player/game-history';
import {
  compactCompletion,
  compactRoundSchema,
} from '../../domain/sync/compact-rounds';
import { downloadJson } from '../../lib/download';
import { clearSaveIssue } from '../../lib/storage/save-health';
import {
  currentOwnerId,
  recoveryDatabase,
  refreshPlayerData,
} from '../../lib/storage/player-storage';
import {
  ensureDeviceState,
  parseDeviceState,
  updateDeviceState,
  writeCompletedRound,
  writePlayerPreferences,
} from '../../lib/storage/rxdb-game';
import {
  deviceSchema,
  playerSchema,
  roundSchema,
  type DeviceRecord,
  type SyncedPlayer,
  type SyncedRound,
} from '../../lib/storage/rxdb-schema';
import {
  migrateDeviceV1,
  migratePlayerV1,
  migrateRoundV1,
} from '../../lib/storage/rxdb-migrations';
import { isRecord, isUtcTimestamp } from '../../lib/validation';
import { selectedAccount } from '../account/account';

const MAX_BACKUP_BYTES = 512 * 1024 * 1024;

export interface PlayerBackup {
  format: 'quizmon-backup-v3';
  exportedAt: string;
  accountId: string | null;
  schemaVersions: {
    players: number;
    rounds: number;
    device: number;
  };
  player: SyncedPlayer | null;
  rounds: SyncedRound[];
  device: DeviceRecord[];
}

export const validateBackupSize = (size: number): void => {
  if (size > MAX_BACKUP_BYTES)
    throw new Error('Choose a Quizmon backup under 512 MiB.');
};

async function createBackup(): Promise<PlayerBackup> {
  const db = recoveryDatabase();
  const ownerId = currentOwnerId();
  const [player, rounds, device] = await Promise.all([
    db.players.findOne(ownerId).exec(),
    db.rounds.find().exec(),
    db.device.find().exec(),
  ]);
  const backup: PlayerBackup = {
    format: 'quizmon-backup-v3',
    exportedAt: new Date().toISOString(),
    accountId: selectedAccount() ?? null,
    schemaVersions: {
      players: db.players.schema.version,
      rounds: db.rounds.schema.version,
      device: db.device.schema.version,
    },
    player: player?.toMutableJSON() ?? null,
    rounds: rounds.map((round) => round.toMutableJSON()),
    device: device.map((record) => record.toMutableJSON()),
  };
  validateBackupSize(new Blob([JSON.stringify(backup)]).size);
  return backup;
}

const header = z.object({
  format: z.literal('quizmon-backup-v3'),
  exportedAt: z.string(),
  accountId: z.string().nullable(),
  schemaVersions: z.object({
    players: z.int().min(0),
    rounds: z.int().min(0),
    device: z.int().min(0),
  }),
  player: z.unknown().nullable(),
  rounds: z.array(z.unknown()),
  device: z.array(z.unknown()),
});

export function parseBackup(text: string): PlayerBackup {
  validateBackupSize(new Blob([text]).size);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON. Choose a Quizmon backup.');
  }
  const parsed = header.safeParse(raw);
  if (!parsed.success || !isUtcTimestamp(parsed.data.exportedAt))
    throw new Error('This is not a valid Quizmon backup.');
  const backup = parsed.data;
  const schemaVersions = {
    players: playerSchema.version,
    rounds: roundSchema.version,
    device: deviceSchema.version,
  };
  for (const name of Object.keys(
    schemaVersions,
  ) as (keyof typeof schemaVersions)[]) {
    if (backup.schemaVersions[name] > schemaVersions[name])
      throw new Error('This backup needs a newer version of Quizmon.');
  }
  // Exported backups pass through the same versioned transforms as RxDB storage.
  // Ordinary reads and scoring only see the current identifiers.
  const playerDocs =
    backup.player === null
      ? []
      : [
          backup.schemaVersions.players === 0
            ? migratePlayerV1(backup.player)
            : backup.player,
        ];
  const roundDocs =
    backup.schemaVersions.rounds === 0
      ? backup.rounds.map(migrateRoundV1)
      : backup.rounds;
  const deviceDocs =
    backup.schemaVersions.device === 0
      ? backup.device.map((value) => {
          // Unfinished rounds are deliberately not restored from exports.
          if (
            isRecord(value) &&
            typeof value.id === 'string' &&
            (value.id.startsWith('closed:') ||
              (value.id.startsWith('round:') &&
                (!isRecord(value.payload) ||
                  value.payload.completedAt === undefined)))
          )
            return value;
          return migrateDeviceV1(value);
        })
      : backup.device;
  if (
    backup.accountId !== null &&
    !/^[A-Za-z0-9_-]{1,128}$/.test(backup.accountId)
  )
    throw new Error('The backup has an invalid account identity.');
  const ownerId = backup.accountId ?? 'guest';
  let player: SyncedPlayer | null = null;
  if (playerDocs[0] !== undefined) {
    const value = playerDocs[0];
    if (!isRecord(value) || value.id !== ownerId)
      throw new Error('The backup has an invalid player.');
    const profile = trainerProfileSchema.safeParse(value.profile);
    const settings = savedSettingsSchema.nullable().safeParse(value.settings);
    if (!profile.success || !settings.success)
      throw new Error('The backup has invalid Trainer settings.');
    player = {
      id: ownerId,
      profile: profile.data,
      settings: settings.data,
    };
  }
  const rounds: SyncedRound[] = roundDocs.map((value) => {
    if (!isRecord(value) || value.ownerId !== ownerId)
      throw new Error('The backup has an invalid completed round.');
    const round = compactRoundSchema.safeParse(value);
    if (!round.success)
      throw new Error('The backup has an invalid completed round.');
    return { ...round.data, ownerId };
  });
  // Completed device receipts can outlive a crash before their fact is committed.
  // Recover these on import; unfinished lineups still do not resume from exports.
  const stateRecord = deviceDocs.find(
    (value) => isRecord(value) && value.id === 'state',
  );
  const restoreId = isRecord(stateRecord)
    ? parseDeviceState(stateRecord.payload).restoreId
    : undefined;
  const closed = new Set(
    deviceDocs.flatMap((value) =>
      isRecord(value) &&
      typeof value.id === 'string' &&
      value.id.startsWith('closed:')
        ? [value.id]
        : [],
    ),
  );
  for (const value of deviceDocs) {
    if (
      !isRecord(value) ||
      typeof value.id !== 'string' ||
      !value.id.startsWith('round:') ||
      !isRecord(value.payload) ||
      value.payload.completedAt === undefined
    )
      continue;
    const receipt = parseRound(value.payload);
    if (!receipt?.completedAt)
      throw new Error('The backup has an invalid completed device round.');
    if (
      receipt.playerRestoreId !== restoreId ||
      closed.has(`closed:${receipt.roundId}`)
    )
      continue;
    const recovered = {
      ...compactCompletion(
        completeRound(receipt, receipt.completedAt, player?.profile.name ?? '')
          .completion,
      ),
      ownerId,
    };
    const existing = rounds.find((round) => round.id === recovered.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(recovered))
      throw new Error('A completed device round differs from this backup.');
    if (!existing) rounds.push(recovered);
  }
  const device: DeviceRecord[] = deviceDocs.flatMap((value) => {
    if (
      isRecord(value) &&
      typeof value.id === 'string' &&
      (value.id.startsWith('round:') || value.id.startsWith('closed:'))
    )
      return [];
    if (
      !isRecord(value) ||
      typeof value.id !== 'string' ||
      !isRecord(value.payload)
    )
      throw new Error('The backup has invalid device data.');
    if (value.id === 'state') parseDeviceState(value.payload);
    else throw new Error('The backup has an unknown device record.');
    return [{ id: value.id, payload: value.payload }];
  });
  if (
    !device.some((record) => record.id === 'state') ||
    new Set(rounds.map(({ id }) => id)).size !== rounds.length ||
    new Set(device.map(({ id }) => id)).size !== device.length
  )
    throw new Error(
      'The backup is missing data or contains duplicate records.',
    );
  return {
    format: 'quizmon-backup-v3',
    exportedAt: backup.exportedAt,
    accountId: backup.accountId,
    schemaVersions,
    player,
    rounds,
    device,
  };
}

export function backupPreview(backup: PlayerBackup): PlayerData {
  return parsePlayerData({
    ...emptyPlayerData(),
    ...projectCompactRoundHistory(
      backup.rounds,
      backup.player?.profile.name ?? '',
    ),
    profile: backup.player?.profile ?? null,
    settings: backup.player?.settings ?? null,
    questionHistory: recentQuestionHistory(backup.rounds),
  });
}

export async function downloadBackup(): Promise<void> {
  const backup = await createBackup();
  const name = (backup.player?.profile.name ?? '')
    .replace(/[<>:"/\\|?*\p{Cc}\p{Cf}\s]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  downloadJson(
    `quizmon-backup-${name ? `${name}-` : ''}${backup.exportedAt.slice(0, 10)}.json`,
    backup,
  );
}

export function verifyAccountBackupRecovery(backup: PlayerBackup) {
  if (!backup.accountId || selectedAccount() !== backup.accountId)
    throw new Error('Sign in to the backup account before restoring it.');
}

export async function restoreBackup(backup: PlayerBackup): Promise<void> {
  const ownerId = currentOwnerId();
  if ((backup.accountId ?? 'guest') !== ownerId)
    throw new Error('This backup belongs to another account.');
  const db = recoveryDatabase();
  await ensureDeviceState(db);
  for (const round of backup.rounds) {
    const existing = await db.rounds.findOne(round.id).exec();
    if (
      existing &&
      JSON.stringify(compactRoundSchema.parse(existing.toMutableJSON())) !==
        JSON.stringify(compactRoundSchema.parse(round))
    )
      throw new Error('A completed round differs from this backup.');
  }
  for (const round of backup.rounds)
    await writeCompletedRound(db, ownerId, round);
  if (backup.player) await writePlayerPreferences(db, ownerId, backup.player);
  const state = parseDeviceState(
    backup.device.find((record) => record.id === 'state')!.payload,
  );
  await updateDeviceState(db, (current) => {
    current.dailyAttempts = {
      ...state.dailyAttempts,
      ...current.dailyAttempts,
    };
  });
  await refreshPlayerData();
  clearSaveIssue();
}

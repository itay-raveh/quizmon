import { z } from 'zod';
import type { ActiveGameSnapshot } from '../../domain/player/active-game';
import { parseRound } from '../../domain/player/schemas/round';
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
import {
  createTrainerProfile,
  trainerProfileSchema,
} from '../../domain/player/trainer-profile';
import {
  compactRoundSchema,
  type CompactRound,
} from '../../domain/sync/compact-rounds';
import type { PlayerDatabase } from './rxdb-database';

const deviceStateSchema = z.object({
  restoreId: z.string().nullable(),
  dailyAttempts: z.record(z.string(), z.unknown()),
});

export type DeviceState = z.infer<typeof deviceStateSchema> & {
  dailyAttempts: Record<string, ActiveGameSnapshot>;
};

export const emptyDeviceState = (): DeviceState => {
  return {
    restoreId: null,
    dailyAttempts: {},
  };
};

export const parseDeviceState = (payload: unknown): DeviceState => {
  const parsed = deviceStateSchema.parse(payload);
  return {
    ...parsed,
    dailyAttempts: Object.fromEntries(
      Object.entries(parsed.dailyAttempts).flatMap(([key, value]) => {
        const round = parseRound(value);
        return round ? [[key, round]] : [];
      }),
    ),
  };
};

export async function ensureDeviceState(db: PlayerDatabase): Promise<void> {
  if (await db.device.findOne('state').exec()) return;
  try {
    await db.device.insert({ id: 'state', payload: emptyDeviceState() });
  } catch (error) {
    if (!(await db.device.findOne('state').exec())) throw error;
  }
}

export async function readDeviceState(
  db: PlayerDatabase,
): Promise<DeviceState> {
  const doc = await db.device.findOne('state').exec();
  if (!doc) throw new Error('The device save is missing. Reload Quizmon.');
  return parseDeviceState(doc.toMutableJSON().payload);
}

export async function updateDeviceState<T>(
  db: PlayerDatabase,
  edit: (state: DeviceState) => T,
): Promise<T> {
  const doc = await db.device.findOne('state').exec();
  if (!doc) throw new Error('The device save is missing. Reload Quizmon.');
  let result!: T;
  await doc.incrementalModify((data) => {
    const state = parseDeviceState(data.payload);
    result = edit(state);
    data.payload = deviceStateSchema.parse(state);
    return data;
  });
  return result;
}

export async function readGameData(
  db: PlayerDatabase,
  ownerId: string,
): Promise<{ data: PlayerData; device: DeviceState }> {
  const [player, device, documents] = await Promise.all([
    db.players.findOne(ownerId).exec(),
    readDeviceState(db),
    db.rounds.find().exec(),
  ]);
  const rounds = documents.flatMap((document) => {
    const saved = document.toMutableJSON();
    if (saved.ownerId !== ownerId)
      throw new Error('A saved completed round belongs to another account.');
    if (compactRoundSchema.safeParse(saved).success) return [saved];
    throw new Error('A saved completed round is invalid.');
  });
  const savedPlayer = player?.toMutableJSON();
  return {
    device,
    data: parsePlayerData({
      ...emptyPlayerData(),
      ...projectCompactRoundHistory(rounds, savedPlayer?.profile.name ?? ''),
      profile: savedPlayer
        ? trainerProfileSchema.parse(savedPlayer.profile)
        : null,
      settings: savedPlayer?.settings
        ? savedSettingsSchema.parse(savedPlayer.settings)
        : null,
      questionHistory: recentQuestionHistory(rounds),
    }),
  };
}

export async function writePlayerPreferences(
  db: PlayerDatabase,
  ownerId: string,
  patch: Pick<Partial<PlayerData>, 'profile' | 'settings'>,
): Promise<void> {
  const player = await db.players.findOne(ownerId).exec();
  const apply = (current: {
    profile: PlayerData['profile'];
    settings: PlayerData['settings'];
  }) => ({
    profile: trainerProfileSchema.parse(
      patch.profile ?? current.profile ?? createTrainerProfile(),
    ),
    settings:
      patch.settings === undefined
        ? (current.settings ?? null)
        : savedSettingsSchema.nullable().parse(patch.settings),
  });
  if (player) {
    await player.incrementalModify((data) => ({ ...data, ...apply(data) }));
    return;
  }
  await db.players.insert({
    id: ownerId,
    ...apply({ profile: null, settings: null }),
  });
}

export async function writeCompletedRound(
  db: PlayerDatabase,
  ownerId: string,
  round: CompactRound,
): Promise<boolean> {
  const parsed = compactRoundSchema.safeParse(round);
  if (!parsed.success) throw new Error('The completed round is invalid.');
  const canonical = parsed.data;
  const existing = await db.rounds.findOne(round.id).exec();
  if (existing) {
    if (
      existing.ownerId !== ownerId ||
      JSON.stringify(compactRoundSchema.parse(existing.toMutableJSON())) !==
        JSON.stringify(canonical)
    )
      throw new Error('This round ID has a different saved result.');
    return false;
  }
  await db.rounds.insert({ ...canonical, ownerId });
  return true;
}

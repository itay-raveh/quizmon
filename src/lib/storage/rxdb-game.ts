import { z } from 'zod';
import {
  parseActiveGameSave,
  type ActiveGameSnapshot,
} from '../../domain/player/active-game';
import { projectRoundHistory } from '../../domain/player/game-history';
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
import { questionHistorySchema } from '../../domain/quiz/question-history';
import {
  validateRoundFact,
  type RoundFact,
} from '../../domain/sync/round-facts';
import type { PlayerDatabase } from './rxdb-database';

const deviceStateSchema = z.object({
  restoreId: z.string().nullable(),
  questionHistory: questionHistorySchema,
  dailyAttempts: z.record(z.string(), z.unknown()),
});

export type DeviceState = z.infer<typeof deviceStateSchema> & {
  dailyAttempts: Record<string, ActiveGameSnapshot>;
};

export const emptyDeviceState = (): DeviceState => {
  const data = emptyPlayerData();
  return {
    restoreId: null,
    questionHistory: data.questionHistory,
    dailyAttempts: {},
  };
};

export const parseDeviceState = (payload: unknown): DeviceState => {
  const parsed = deviceStateSchema.parse(payload);
  return {
    ...parsed,
    dailyAttempts: Object.fromEntries(
      Object.entries(parsed.dailyAttempts).map(([key, value]) => [
        key,
        parseActiveGameSave(value),
      ]),
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
  return parseDeviceState(doc.payload);
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
  const rounds = documents.map((document) => {
    if (document.ownerId !== ownerId || !validateRoundFact(document.fact))
      throw new Error('A saved completed round is invalid.');
    return document.fact;
  });
  rounds.sort(
    (a, b) =>
      a.completed_at.localeCompare(b.completed_at) || a.id.localeCompare(b.id),
  );
  if (player && player.ownerId !== ownerId)
    throw new Error('The saved player belongs to another account.');
  return {
    device,
    data: parsePlayerData({
      ...emptyPlayerData(),
      ...projectRoundHistory(rounds),
      profile: player ? trainerProfileSchema.parse(player.profile) : null,
      settings: player?.settings
        ? savedSettingsSchema.parse(player.settings)
        : null,
      questionHistory: device.questionHistory,
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
      patch.settings !== undefined && patch.settings !== null
        ? savedSettingsSchema.parse(patch.settings)
        : patch.settings === null
          ? null
          : (current.settings ?? null),
  });
  if (player) {
    await player.incrementalModify((data) => ({ ...data, ...apply(data) }));
    return;
  }
  await db.players.insert({
    id: ownerId,
    ownerId,
    ...apply({ profile: null, settings: null }),
  });
}

export async function writeCompletedRound(
  db: PlayerDatabase,
  ownerId: string,
  fact: RoundFact,
): Promise<boolean> {
  if (!validateRoundFact(fact))
    throw new Error('The completed round is invalid.');
  const existing = await db.rounds.findOne(fact.id).exec();
  if (existing) {
    if (
      existing.ownerId !== ownerId ||
      JSON.stringify(existing.fact) !== JSON.stringify(fact)
    )
      throw new Error('This round ID has a different saved result.');
    return false;
  }
  await db.rounds.insert({ id: fact.id, ownerId, fact });
  return true;
}

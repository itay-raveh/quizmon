import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { canonical, hash } from '../src/domain/sync/progress.ts';
import {
  scoreRound,
  validateRoundFact,
  type RoundFact,
} from '../src/domain/sync/round-facts.ts';
import { isDailyDate, isRecord, isUuid } from '../src/lib/validation.ts';
import { isTrainerAvatar } from '../src/domain/player/trainer-avatars.ts';
import {
  getTrainerSpecialtyCount,
  trainerSpecialtyDetails,
  type TrainerSpecialty,
} from '../src/domain/player/trainer-progression.ts';
import pokemonGenerations from '../src/domain/pokemon/data/pokemon-generations.json' with { type: 'json' };
import { formGroups, generations } from '../src/domain/pokemon/types.ts';
import { questionTypes } from '../src/domain/quiz/questions/definitions.ts';
import * as schema from './target-schema.ts';

type Tx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

export class TargetProgressError extends Error {
  readonly code: string;
  readonly status: 400 | 409 | 503;
  constructor(code: string, status: 400 | 409 | 503 = 409) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function friendCode() {
  return [...crypto.getRandomValues(new Uint8Array(8))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export async function targetBootstrap(db: NodePgDatabase, playerId: string) {
  await db
    .insert(schema.instance)
    .values({ id: 1, epoch: crypto.randomUUID() })
    .onConflictDoNothing();
  const [instance] = await db
    .select()
    .from(schema.instance)
    .where(eq(schema.instance.id, 1));
  if (!instance) throw new TargetProgressError('instance_missing', 503);
  for (let attempt = 0; attempt < 4; attempt++) {
    const [existing] = await db
      .select()
      .from(schema.player)
      .where(eq(schema.player.id, playerId));
    if (existing) return { player: existing, epoch: instance.epoch };
    await db
      .insert(schema.player)
      .values({ id: playerId, code: friendCode() })
      .onConflictDoNothing();
  }
  throw new TargetProgressError('player_initialization_failed', 503);
}

async function checkEpoch(tx: Tx, epoch: string) {
  const [instance] = await tx
    .select()
    .from(schema.instance)
    .where(eq(schema.instance.id, 1))
    .for('share');
  if (!instance || instance.epoch !== epoch)
    throw new TargetProgressError('instance_changed');
}

async function checkDataset(tx: Tx, playerId: string, datasetId: string) {
  const [claim] = await tx
    .select()
    .from(schema.dataset)
    .where(eq(schema.dataset.id, datasetId));
  if (!claim || claim.playerId !== playerId)
    throw new TargetProgressError('dataset_not_linked');
}

export async function targetLinkDataset(
  db: NodePgDatabase,
  playerId: string,
  datasetId: string,
  epoch: string,
  merge: boolean,
  joinedOn?: string,
) {
  if (!isUuid(datasetId) || (joinedOn !== undefined && !isDailyDate(joinedOn)))
    throw new TargetProgressError('invalid_link', 400);
  return db.transaction(async (tx) => {
    await checkEpoch(tx, epoch);
    const [player] = await tx
      .select()
      .from(schema.player)
      .where(eq(schema.player.id, playerId))
      .for('update');
    if (!player) throw new TargetProgressError('player_missing');
    const [existing] = await tx
      .select()
      .from(schema.dataset)
      .where(eq(schema.dataset.id, datasetId));
    if (existing) {
      if (existing.playerId !== playerId)
        throw new TargetProgressError('dataset_already_claimed');
      return { linked: true };
    }
    if (!merge) {
      const [priorRound] = await tx
        .select({ id: schema.round.id })
        .from(schema.round)
        .where(eq(schema.round.playerId, playerId))
        .limit(1);
      const [priorDataset] = await tx
        .select({ id: schema.dataset.id })
        .from(schema.dataset)
        .where(eq(schema.dataset.playerId, playerId))
        .limit(1);
      if (
        priorRound ||
        priorDataset ||
        player.name ||
        player.avatar ||
        player.partner ||
        player.specialty
      )
        return { linked: false, mergeRequired: true };
    }
    const inserted = await tx
      .insert(schema.dataset)
      .values({ id: datasetId, playerId })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length)
      throw new TargetProgressError('dataset_already_claimed');
    if (joinedOn && joinedOn < player.joinedOn)
      await tx
        .update(schema.player)
        .set({ joinedOn })
        .where(eq(schema.player.id, playerId));
    return { linked: true };
  });
}

export type RoundUpload = Omit<RoundFact, 'credited'>;

function validateRoundUpload(value: unknown): value is RoundUpload {
  return (
    isRecord(value) &&
    !Object.hasOwn(value, 'credited') &&
    validateRoundFact({ ...value, credited: true })
  );
}

export async function targetSubmitRound(
  db: NodePgDatabase,
  playerId: string,
  datasetId: string,
  epoch: string,
  value: unknown,
) {
  if (!isUuid(datasetId)) throw new TargetProgressError('invalid_dataset', 400);
  if (!validateRoundUpload(value))
    throw new TargetProgressError('invalid_round', 400);
  const incoming = value;
  return db.transaction(async (tx) => {
    await checkEpoch(tx, epoch);
    const [player] = await tx
      .select({ id: schema.player.id })
      .from(schema.player)
      .where(eq(schema.player.id, playerId))
      .for('update');
    if (!player) throw new TargetProgressError('player_missing');
    await checkDataset(tx, playerId, datasetId);
    const [existing] = await tx
      .select()
      .from(schema.round)
      .where(eq(schema.round.id, incoming.id));
    if (existing) {
      const same =
        existing.playerId === playerId &&
        canonical({
          id: existing.id,
          mode: existing.mode,
          day: existing.day,
          puzzle_id: existing.puzzleId,
          started_on: existing.startedOn,
          completed_at: new Date(existing.completedAt).toISOString(),
          data: existing.data,
        }) === canonical(incoming);
      if (!same) throw new TargetProgressError('round_id_conflict');
      return {
        id: incoming.id,
        status: 'accepted' as const,
        credited: existing.credited,
      };
    }
    const [priorDaily] =
      incoming.mode === 'daily'
        ? await tx
            .select({ id: schema.round.id })
            .from(schema.round)
            .where(
              and(
                eq(schema.round.playerId, playerId),
                eq(schema.round.mode, 'daily'),
                eq(schema.round.day, incoming.day!),
                eq(schema.round.credited, true),
              ),
            )
            .limit(1)
        : [];
    const credited = incoming.mode !== 'daily' || !priorDaily;
    const inserted = await tx
      .insert(schema.round)
      .values({
        id: incoming.id,
        playerId,
        mode: incoming.mode,
        day: incoming.day,
        puzzleId: incoming.puzzle_id,
        startedOn: incoming.started_on,
        completedAt: incoming.completed_at,
        credited,
        data: incoming.data,
      })
      .onConflictDoNothing()
      .returning({ id: schema.round.id });
    if (!inserted.length) throw new TargetProgressError('round_id_conflict');
    const result = scoreRound({
      mode: incoming.mode,
      data: incoming.data,
      puzzle_id: incoming.puzzle_id,
    });
    await tx.insert(schema.roundScore).values({
      roundId: incoming.id,
      score: result.score,
      elapsedMs: result.elapsedMilliseconds ?? 0,
    });
    return { id: incoming.id, status: 'accepted' as const, credited };
  });
}

type EditUnit =
  | 'name'
  | 'avatar'
  | 'partner'
  | 'specialty'
  | 'answer_flow'
  | 'timer_display'
  | 'training';
export interface EditUpload {
  id: string;
  unit: EditUnit;
  value: unknown;
}

function validateEditUpload(value: unknown): value is EditUpload {
  if (!isRecord(value) || !isUuid(value.id)) return false;
  if (value.unit === 'name')
    return (
      typeof value.value === 'string' &&
      value.value.length <= 20 &&
      value.value.trim() === value.value
    );
  if (value.unit === 'avatar')
    return value.value === null || isTrainerAvatar(value.value);
  if (value.unit === 'partner')
    return (
      value.value === null ||
      (typeof value.value === 'string' &&
        Object.hasOwn(pokemonGenerations, value.value))
    );
  if (value.unit === 'specialty')
    return (
      value.value === null ||
      (typeof value.value === 'string' &&
        Object.hasOwn(trainerSpecialtyDetails, value.value))
    );
  if (value.unit === 'answer_flow')
    return ['manual', 'auto', 'instant'].includes(String(value.value));
  if (value.unit === 'timer_display')
    return ['hidden', 'seconds', 'milliseconds'].includes(String(value.value));
  if (value.unit === 'training') {
    const training = value.value;
    const selections = (items: unknown, allowed: readonly string[]) =>
      Array.isArray(items) &&
      items.length > 0 &&
      items.length <= allowed.length &&
      items.every(
        (item) => typeof item === 'string' && allowed.includes(item),
      ) &&
      new Set(items).size === items.length;
    return (
      isRecord(training) &&
      Number.isInteger(training.difficulty) &&
      Number(training.difficulty) >= 1 &&
      Number(training.difficulty) <= 5 &&
      ['league', 'custom'].includes(String(training.training_mode)) &&
      ['automatic', 'custom'].includes(String(training.question_selection)) &&
      selections(training.generations, generations) &&
      selections(training.form_groups, formGroups) &&
      selections(training.question_types, questionTypes) &&
      (training.auto_types === null ||
        training.auto_types === undefined ||
        selections(training.auto_types, questionTypes))
    );
  }
  return false;
}

export async function targetApplyEdit(
  db: NodePgDatabase,
  playerId: string,
  datasetId: string,
  epoch: string,
  value: unknown,
) {
  if (!isUuid(datasetId)) throw new TargetProgressError('invalid_dataset', 400);
  if (!isRecord(value) || !isUuid(value.id))
    throw new TargetProgressError('invalid_edit', 400);
  const id = value.id;
  const requestHash = await hash({ dataset_id: datasetId, edit: value });
  return db.transaction(async (tx) => {
    await checkEpoch(tx, epoch);
    const [player] = await tx
      .select()
      .from(schema.player)
      .where(eq(schema.player.id, playerId))
      .for('update');
    if (!player) throw new TargetProgressError('player_missing');
    await checkDataset(tx, playerId, datasetId);
    const [previous] = await tx
      .select()
      .from(schema.op)
      .where(eq(schema.op.id, id));
    if (previous) {
      if (
        previous.playerId !== playerId ||
        (previous.hash !== requestHash && previous.hash !== value.legacy_hash)
      )
        throw new TargetProgressError('operation_id_conflict');
      return { id, status: previous.status, reason: previous.reason };
    }
    let reason: string | null = null;
    if (!validateEditUpload(value)) reason = 'invalid_edit';
    if (!reason && value.unit === 'specialty' && value.value !== null) {
      // Specialty eligibility is derived from credited rounds at application time.
      const rows = await tx
        .select({ data: schema.round.data, mode: schema.round.mode })
        .from(schema.round)
        .where(
          and(
            eq(schema.round.playerId, playerId),
            eq(schema.round.credited, true),
          ),
        );
      const counts: Record<string, number> = {};
      for (const answer of rows.flatMap((row) => row.data.answers)) {
        if (
          answer.question.selected.length !== answer.question.expected.length ||
          !answer.question.expected.every((expected) =>
            answer.question.selected.includes(expected),
          )
        )
          continue;
        counts[answer.question_type] = (counts[answer.question_type] ?? 0) + 1;
      }
      if (
        getTrainerSpecialtyCount(counts, value.value as TrainerSpecialty) < 10
      )
        reason = 'specialty_not_earned';
    }
    if (!reason) {
      const edit = value as unknown as EditUpload;
      const patch =
        edit.unit === 'training'
          ? {
              trainingMode: (edit.value as Record<string, unknown>)
                .training_mode as string,
              difficulty: (edit.value as Record<string, unknown>)
                .difficulty as number,
              questionSelection: (edit.value as Record<string, unknown>)
                .question_selection as string,
              generations: (edit.value as Record<string, unknown>)
                .generations as string[],
              formGroups: (edit.value as Record<string, unknown>)
                .form_groups as string[],
              questionTypes: (edit.value as Record<string, unknown>)
                .question_types as string[],
              autoTypes:
                ((edit.value as Record<string, unknown>).auto_types as
                  string[] | null) ?? null,
            }
          : {
              [(
                {
                  name: 'name',
                  avatar: 'avatar',
                  partner: 'partner',
                  specialty: 'specialty',
                  answer_flow: 'answerFlow',
                  timer_display: 'timerDisplay',
                } as const
              )[edit.unit]]: edit.value,
            };
      await tx
        .update(schema.player)
        .set(patch)
        .where(eq(schema.player.id, playerId));
    }
    await tx.insert(schema.op).values({
      id,
      playerId,
      hash: requestHash,
      status: reason ? 'rejected' : 'accepted',
      reason,
    });
    return { id, status: reason ? 'rejected' : 'accepted', reason };
  });
}

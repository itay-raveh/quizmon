import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { canonical, hash } from '../src/domain/sync/progress.ts';
import { editUploadSchema } from '../src/domain/sync/edit-upload.ts';
import {
  scoreRound,
  validateRoundUpload,
} from '../src/domain/sync/round-facts.ts';
import { isRecord, isUuid } from '../src/lib/validation.ts';
import { getTrainerSpecialtyCount } from '../src/domain/player/trainer-progression.ts';
import { defaultGameSettings } from '../src/domain/settings/game-settings.ts';
import * as schema from './schema.ts';

type Tx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

export class ProgressError extends Error {
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

export async function bootstrapPlayer(db: NodePgDatabase, playerId: string) {
  await db
    .insert(schema.instance)
    .values({ id: 1, epoch: crypto.randomUUID() })
    .onConflictDoNothing();
  const [instance] = await db
    .select()
    .from(schema.instance)
    .where(eq(schema.instance.id, 1));
  if (!instance) throw new ProgressError('instance_missing', 503);
  for (let attempt = 0; attempt < 4; attempt++) {
    const [existing] = await db
      .select()
      .from(schema.player)
      .where(eq(schema.player.id, playerId));
    if (existing) return { player: existing, epoch: instance.epoch };
    await db
      .insert(schema.player)
      .values({
        id: playerId,
        code: friendCode(),
        questionTypes: defaultGameSettings.questionTypes,
      })
      .onConflictDoNothing();
  }
  throw new ProgressError('player_initialization_failed', 503);
}

async function checkEpoch(tx: Tx, epoch: string) {
  const [instance] = await tx
    .select()
    .from(schema.instance)
    .where(eq(schema.instance.id, 1))
    .for('share');
  if (!instance || instance.epoch !== epoch)
    throw new ProgressError('instance_changed');
}

async function checkDataset(tx: Tx, playerId: string, datasetId: string) {
  const [claim] = await tx
    .select()
    .from(schema.dataset)
    .where(eq(schema.dataset.id, datasetId));
  if (!claim || claim.playerId !== playerId)
    throw new ProgressError('dataset_not_linked');
}

export async function linkDataset(
  db: NodePgDatabase,
  playerId: string,
  datasetId: string,
  epoch: string,
  merge: boolean,
  joinedOn?: string,
) {
  return db.transaction(async (tx) => {
    await checkEpoch(tx, epoch);
    const [player] = await tx
      .select()
      .from(schema.player)
      .where(eq(schema.player.id, playerId))
      .for('update');
    if (!player) throw new ProgressError('player_missing');
    const [existing] = await tx
      .select()
      .from(schema.dataset)
      .where(eq(schema.dataset.id, datasetId));
    if (existing) {
      if (existing.playerId !== playerId)
        throw new ProgressError('dataset_already_claimed');
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
    if (!inserted.length) throw new ProgressError('dataset_already_claimed');
    if (joinedOn && joinedOn < player.joinedOn)
      await tx
        .update(schema.player)
        .set({ joinedOn })
        .where(eq(schema.player.id, playerId));
    return { linked: true };
  });
}

export async function submitRound(
  db: NodePgDatabase,
  playerId: string,
  datasetId: string,
  epoch: string,
  value: unknown,
) {
  if (!isUuid(datasetId)) throw new ProgressError('invalid_dataset', 400);
  if (!validateRoundUpload(value))
    throw new ProgressError('invalid_round', 400);
  const incoming = value;
  return db.transaction(async (tx) => {
    await checkEpoch(tx, epoch);
    const [player] = await tx
      .select({ id: schema.player.id })
      .from(schema.player)
      .where(eq(schema.player.id, playerId))
      .for('update');
    if (!player) throw new ProgressError('player_missing');
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
      if (!same) throw new ProgressError('round_id_conflict');
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
    if (!inserted.length) throw new ProgressError('round_id_conflict');
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

export async function applyEdit(
  db: NodePgDatabase,
  playerId: string,
  datasetId: string,
  epoch: string,
  value: unknown,
) {
  if (!isUuid(datasetId)) throw new ProgressError('invalid_dataset', 400);
  if (!isRecord(value) || !isUuid(value.id))
    throw new ProgressError('invalid_edit', 400);
  const id = value.id;
  const requestHash = await hash({ dataset_id: datasetId, edit: value });
  return db.transaction(async (tx) => {
    await checkEpoch(tx, epoch);
    const [player] = await tx
      .select()
      .from(schema.player)
      .where(eq(schema.player.id, playerId))
      .for('update');
    if (!player) throw new ProgressError('player_missing');
    await checkDataset(tx, playerId, datasetId);
    const [previous] = await tx
      .select()
      .from(schema.op)
      .where(eq(schema.op.id, id));
    if (previous) {
      if (previous.playerId !== playerId || previous.hash !== requestHash)
        throw new ProgressError('operation_id_conflict');
      return { id, status: previous.status, reason: previous.reason };
    }
    const parsed = editUploadSchema.safeParse(value);
    const edit = parsed.success ? parsed.data : null;
    let reason: string | null = edit ? null : 'invalid_edit';
    if (edit?.unit === 'specialty' && edit.value !== null) {
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
      if (getTrainerSpecialtyCount(counts, edit.value) < 10)
        reason = 'specialty_not_earned';
    }
    if (!reason && edit) {
      const patch =
        edit.unit === 'training'
          ? {
              trainingMode: edit.value.training_mode,
              difficulty: edit.value.difficulty,
              questionSelection: edit.value.question_selection,
              generations: edit.value.generations,
              formGroups: edit.value.form_groups,
              questionTypes: edit.value.question_types,
              autoTypes: edit.value.auto_types ?? null,
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

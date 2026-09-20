import {
  getTrainerSpecialtyCount,
  type TrainerSpecialty,
} from '../src/domain/player/trainer-progression.ts';
import { progressProjectionVersion } from '../src/domain/player/game-history.ts';
import { rebuildAccountProgress } from './progress-rebuild.ts';
import { isRecord, isUuid } from '../src/lib/validation.ts';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  canonical,
  combine,
  contribution,
  emptyContribution,
  hash,
  utcDay,
  validAction,
  validDiscoveries,
  validEdit,
  validateCompletion,
  versions,
  type Action,
  type ActionEnvelope,
  type Contribution,
  type Outcome,
  type RoundCompletion,
} from '../src/domain/sync/progress.ts';
import * as schema from './progress-schema.ts';

type Tx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];
export class ProgressError extends Error {
  code: string;
  status: 409 | 503;
  constructor(code: string, status: 409 | 503 = 409) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export async function bootstrap(db: NodePgDatabase, owner: string) {
  await db
    .insert(schema.serviceState)
    .values({ id: 'main', epoch: crypto.randomUUID() })
    .onConflictDoNothing();
  const [service] = await db
    .select()
    .from(schema.serviceState)
    .where(eq(schema.serviceState.id, 'main'));
  if (!service || service.fenced)
    throw new ProgressError('service_recovery', 503);
  await db
    .insert(schema.accountState)
    .values({
      id: owner,
      generationId: crypto.randomUUID(),
      progress: emptyContribution(),
    })
    .onConflictDoNothing();
  let [account] = await db
    .select()
    .from(schema.accountState)
    .where(eq(schema.accountState.id, owner));
  if (!account) throw new Error('Account initialization failed.');
  if (account.projectionVersion !== progressProjectionVersion) {
    await rebuildAccountProgress(db, owner);
    [account] = await db
      .select()
      .from(schema.accountState)
      .where(eq(schema.accountState.id, owner));
    if (!account) throw new Error('Account initialization failed.');
  }
  return { account, serverEpoch: service.epoch, versions };
}

export async function linkDataset(
  db: NodePgDatabase,
  owner: string,
  datasetId: string,
  linkId: string,
  generationId: string,
  merge: boolean,
  serverEpoch: string,
  profileCreatedAt?: string,
) {
  return db.transaction(async (tx) => {
    const [service] = await tx
      .select()
      .from(schema.serviceState)
      .where(eq(schema.serviceState.id, 'main'))
      .for('share');
    if (!service || service.fenced)
      throw new ProgressError('service_recovery', 503);
    if (service.epoch !== serverEpoch)
      throw new ProgressError('server_epoch_changed');
    const [account] = await tx
      .select()
      .from(schema.accountState)
      .where(eq(schema.accountState.id, owner))
      .for('update');
    if (!account || account.generationId !== generationId)
      throw new ProgressError('generation_changed');
    const [existing] = await tx
      .select()
      .from(schema.linkedDatasets)
      .where(eq(schema.linkedDatasets.id, datasetId));
    if (existing) {
      if (existing.ownerId !== owner || existing.generationId !== generationId)
        throw new ProgressError('dataset_already_claimed');
      return { linked: true };
    }
    const [discovery] = await tx
      .select({ id: schema.playerPokemon.id })
      .from(schema.playerPokemon)
      .where(
        and(
          eq(schema.playerPokemon.ownerId, owner),
          eq(schema.playerPokemon.generationId, generationId),
        ),
      )
      .limit(1);
    if (
      !merge &&
      (account.revision > 0 || account.progress.rounds > 0 || discovery)
    )
      return { linked: false, mergeRequired: true };
    const inserted = await tx
      .insert(schema.linkedDatasets)
      .values({ id: datasetId, ownerId: owner, generationId, linkId })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length) throw new ProgressError('dataset_already_claimed');
    if (profileCreatedAt)
      await tx
        .update(schema.accountState)
        .set({
          profileCreatedAt:
            account.profileCreatedAt < profileCreatedAt
              ? account.profileCreatedAt
              : profileCreatedAt,
        })
        .where(eq(schema.accountState.id, owner));
    // Reserve the empty-account decision before the first guest upload arrives.
    if (!merge)
      await tx
        .update(schema.accountState)
        .set({ revision: account.revision + 1 })
        .where(eq(schema.accountState.id, owner));
    return { linked: true };
  });
}

async function addPokemon(
  tx: Tx,
  ownerId: string,
  generationId: string,
  effect: Contribution,
) {
  for (const pokemon of new Set([
    ...effect.discoveries,
    ...effect.correctPokemon,
  ])) {
    await tx
      .insert(schema.playerPokemon)
      .values({
        id: crypto.randomUUID(),
        ownerId,
        generationId,
        pokemon,
        discovered: effect.discoveries.includes(pokemon),
        correct: effect.correctPokemon.includes(pokemon),
      })
      .onConflictDoUpdate({
        target: [
          schema.playerPokemon.ownerId,
          schema.playerPokemon.generationId,
          schema.playerPokemon.pokemon,
        ],
        set: {
          discovered: sql`${schema.playerPokemon.discovered} OR excluded.discovered`,
          correct: sql`${schema.playerPokemon.correct} OR excluded.correct`,
        },
      });
  }
}
async function applyCompletion(
  tx: Tx,
  ownerId: string,
  action: Action,
  revision: number,
) {
  if (
    !isRecord(action.payload) ||
    !isUuid(action.payload.completionId) ||
    !isUuid(action.payload.datasetId)
  )
    return {
      code: 'invalid_identity',
      effect: emptyContribution(),
      status: 'rejected' as const,
    };
  const round = action.payload as unknown as RoundCompletion;
  if (round.datasetId !== action.datasetId)
    return {
      code: 'dataset_mismatch',
      effect: emptyContribution(),
      status: 'rejected' as const,
    };
  const generationId = action.generationId;
  const fingerprint = await hash(round);
  const [previous] = await tx
    .select()
    .from(schema.completionFacts)
    .where(
      and(
        eq(schema.completionFacts.ownerId, ownerId),
        eq(schema.completionFacts.generationId, generationId),
        eq(schema.completionFacts.completionId, round.completionId),
      ),
    );
  if (previous)
    return {
      code:
        previous.hash === fingerprint
          ? 'already_recorded'
          : 'completion_id_conflict',
      effect: emptyContribution(),
      status:
        previous.hash === fingerprint
          ? ('accepted' as const)
          : ('conflict' as const),
    };
  const validation = validateCompletion(action.payload);
  if (validation === 'unsupported_version') throw new ProgressError(validation);
  if (validation)
    return {
      code: validation,
      effect: emptyContribution(),
      status: 'rejected' as const,
    };
  const [daily] =
    round.mode === 'daily'
      ? await tx
          .select()
          .from(schema.dailyResults)
          .where(
            and(
              eq(schema.dailyResults.ownerId, ownerId),
              eq(schema.dailyResults.generationId, generationId),
              eq(schema.dailyResults.date, round.dailyDate!),
            ),
          )
      : [];
  const eligible = !daily;
  const effect = contribution(round, eligible);
  await tx.insert(schema.completionFacts).values({
    id: crypto.randomUUID(),
    ownerId,
    generationId,
    completionId: round.completionId,
    datasetId: round.datasetId,
    hash: fingerprint,
    completion: round,
    completedAt: round.completedAt,
    recordVersion: round.recordVersion,
    progressVersion: round.progressVersion,
    mode: round.mode,
    dailyDate: round.dailyDate,
    scoreVersion: round.scoreVersion,
    contentVersion: round.contentVersion,
    generatorVersion: round.generatorVersion,
    contribution: effect,
    eligible,
    revision,
  });
  if (round.mode === 'daily' && eligible)
    await tx.insert(schema.dailyResults).values({
      id: crypto.randomUUID(),
      ownerId,
      generationId,
      date: round.dailyDate!,
      score: round.result.score,
      elapsedMilliseconds: round.result.elapsedMilliseconds,
      completionId: round.completionId,
      result: round.result,
      streakCredit: utcDay(round.completedAt) === round.dailyDate,
    });
  return {
    code: daily ? 'daily_already_recorded' : 'recorded',
    effect,
    status: daily ? ('conflict' as const) : ('accepted' as const),
  };
}

export async function applyAction(
  db: NodePgDatabase,
  ownerId: string,
  serverEpoch: string,
  action: ActionEnvelope,
): Promise<Outcome> {
  const requestHash = await hash(action);
  return db.transaction(async (tx) => {
    const [service] = await tx
      .select()
      .from(schema.serviceState)
      .where(eq(schema.serviceState.id, 'main'))
      .for('share');
    if (!service || service.fenced)
      throw new ProgressError('service_recovery', 503);
    if (service.epoch !== serverEpoch)
      throw new ProgressError('server_epoch_changed');
    const [account] = await tx
      .select()
      .from(schema.accountState)
      .where(eq(schema.accountState.id, ownerId))
      .for('update');
    if (!account || account.generationId !== action.generationId)
      throw new ProgressError('generation_changed');
    const [dataset] = await tx
      .select()
      .from(schema.linkedDatasets)
      .where(eq(schema.linkedDatasets.id, action.datasetId));
    if (
      !dataset ||
      dataset.ownerId !== ownerId ||
      dataset.generationId !== action.generationId
    )
      throw new ProgressError('dataset_not_linked');
    const [previous] = await tx
      .select()
      .from(schema.operationOutcomes)
      .where(
        and(
          eq(schema.operationOutcomes.ownerId, ownerId),
          eq(schema.operationOutcomes.generationId, action.generationId),
          eq(schema.operationOutcomes.operationId, action.operationId),
        ),
      );
    if (previous)
      return previous.hash === requestHash
        ? previous.outcome
        : {
            operationId: action.operationId,
            requestHash,
            revision: account.revision,
            status: 'conflict',
            code: 'operation_id_conflict',
          };
    if (action.payloadVersion !== versions.payload || !validAction(action))
      throw new ProgressError('unsupported_version');
    const revision = account.revision + 1;
    let effect = emptyContribution();
    const outcome: Outcome = {
      operationId: action.operationId,
      requestHash,
      revision,
      status: 'accepted',
      code: 'recorded',
    };
    const edits = { ...account.edits };
    const editRevisions = { ...account.editRevisions };
    if (action.kind === 'completion.record') {
      const result = await applyCompletion(tx, ownerId, action, revision);
      effect = result.effect;
      outcome.code = result.code;
      outcome.status = result.status;
    } else if (action.kind === 'discoveries.add') {
      if (validDiscoveries(action.payload))
        effect.discoveries = action.payload.pokemon;
      else {
        outcome.status = 'rejected';
        outcome.code = 'invalid_discoveries';
      }
    } else if (action.kind === 'issue.dismiss') {
      if (typeof action.payload !== 'string') {
        outcome.status = 'rejected';
        outcome.code = 'invalid_issue';
      } else
        await tx
          .update(schema.syncIssues)
          .set({ dismissed: true })
          .where(
            and(
              eq(schema.syncIssues.ownerId, ownerId),
              eq(schema.syncIssues.generationId, action.generationId),
              eq(schema.syncIssues.operationId, action.payload),
            ),
          );
    } else if (!validEdit(action.payload)) {
      outcome.status = 'rejected';
      outcome.code = 'invalid_edit';
    } else {
      const edit = action.payload;
      const profileUnit = ['name', 'partnerPokemon', 'specialty'].includes(
        edit.unit,
      );
      if ((action.kind === 'profile.patch') !== profileUnit) {
        outcome.status = 'rejected';
        outcome.code = 'invalid_edit_unit';
      } else if (
        edit.unit === 'specialty' &&
        typeof edit.value === 'string' &&
        getTrainerSpecialtyCount(
          account.progress.correctQuestionTypes,
          edit.value as TrainerSpecialty,
        ) < 10
      ) {
        outcome.status = 'rejected';
        outcome.code = 'specialty_not_earned';
      } else {
        let expected = edit.expectedRevision;
        if (edit.predecessorId) {
          const [predecessor] = await tx
            .select()
            .from(schema.operationOutcomes)
            .where(
              and(
                eq(schema.operationOutcomes.ownerId, ownerId),
                eq(schema.operationOutcomes.generationId, action.generationId),
                eq(schema.operationOutcomes.operationId, edit.predecessorId),
              ),
            );
          expected =
            predecessor?.outcome.status === 'accepted' &&
            predecessor.outcome.unit === edit.unit
              ? (predecessor.outcome.unitRevision ?? -1)
              : -1;
        }
        const unitRevision = editRevisions[edit.unit] ?? 0;
        const same =
          canonical(edits[edit.unit] ?? null) === canonical(edit.value);
        if (!same && expected !== unitRevision) {
          outcome.status = 'conflict';
          outcome.code = 'edit_conflict';
        } else {
          edits[edit.unit] = edit.value;
          editRevisions[edit.unit] = same ? unitRevision : revision;
          outcome.unit = edit.unit;
          outcome.unitRevision = editRevisions[edit.unit];
        }
      }
    }
    await addPokemon(tx, ownerId, action.generationId, effect);
    const progress = combine(account.progress, effect);
    progress.correctPokemon = [];
    progress.discoveries = [];
    await tx
      .update(schema.accountState)
      .set({ progress, edits, editRevisions, revision })
      .where(eq(schema.accountState.id, ownerId));
    if (outcome.status !== 'accepted')
      await tx.insert(schema.syncIssues).values({
        id: crypto.randomUUID(),
        ownerId,
        generationId: action.generationId,
        operationId: action.operationId,
        reason: outcome.code,
        payload: action.payload,
      });
    await tx.insert(schema.operationOutcomes).values({
      id: crypto.randomUUID(),
      ownerId,
      generationId: action.generationId,
      operationId: action.operationId,
      hash: requestHash,
      outcome,
      effect: action.kind === 'discoveries.add' ? effect : emptyContribution(),
    });
    return outcome;
  });
}

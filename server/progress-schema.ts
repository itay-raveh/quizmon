import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  Contribution,
  EditUnit,
  EditValue,
  Outcome,
  RoundCompletion,
} from '../src/domain/sync/progress.ts';
import { user } from './auth-schema.ts';

const scope = () => ({
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  generationId: uuid('generation_id').notNull(),
});
export const serviceState = pgTable('service_state', {
  id: text().primaryKey(),
  epoch: uuid().notNull(),
  fenced: boolean().notNull().default(false),
});
export const accountState = pgTable('account_state', {
  id: text()
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  generationId: uuid('generation_id').notNull(),
  revision: integer().notNull().default(0),
  projectionVersion: integer('projection_version').notNull().default(1),
  profileCreatedAt: text('profile_created_at')
    .notNull()
    .default(sql`to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD')`),
  progress: jsonb().$type<Contribution>().notNull(),
  edits: jsonb()
    .$type<Partial<Record<EditUnit, EditValue>>>()
    .notNull()
    .default({}),
  editRevisions: jsonb('edit_revisions')
    .$type<Partial<Record<EditUnit, number>>>()
    .notNull()
    .default({}),
});
export const linkedDatasets = pgTable('linked_datasets', {
  id: uuid().primaryKey(),
  ...scope(),
  linkId: uuid('link_id').notNull(),
});
export const completionFacts = pgTable(
  'completion_facts',
  {
    id: uuid().primaryKey(),
    ...scope(),
    completionId: uuid('completion_id').notNull(),
    datasetId: uuid('dataset_id').notNull(),
    hash: text().notNull(),
    completion: jsonb().$type<RoundCompletion>().notNull(),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    recordVersion: integer('record_version').notNull(),
    progressVersion: integer('progress_version').notNull(),
    mode: text().notNull(),
    dailyDate: text('daily_date'),
    scoreVersion: integer('score_version').notNull(),
    contentVersion: integer('content_version').notNull(),
    generatorVersion: integer('generator_version'),
    contribution: jsonb().$type<Contribution>().notNull(),
    eligible: boolean().notNull(),
    revision: integer().notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('completion_mode', sql`${t.mode} IN ('daily', 'training', 'league')`),
    check(
      'completion_date',
      sql`(${t.mode} = 'daily') = (${t.dailyDate} IS NOT NULL)`,
    ),
    check('completion_record_version', sql`${t.recordVersion} > 0`),
    unique('completion_identity').on(t.ownerId, t.generationId, t.completionId),
  ],
);
export const operationOutcomes = pgTable(
  'operation_outcomes',
  {
    id: uuid().primaryKey(),
    ...scope(),
    operationId: uuid('operation_id').notNull(),
    hash: text().notNull(),
    outcome: jsonb().$type<Outcome>().notNull(),
    effect: jsonb().$type<Contribution>().notNull(),
  },
  (t) => [
    uniqueIndex('operation_identity').on(
      t.ownerId,
      t.generationId,
      t.operationId,
    ),
  ],
);
export const playerPokemon = pgTable(
  'player_pokemon',
  {
    id: uuid().primaryKey(),
    ...scope(),
    pokemon: text().notNull(),
    discovered: boolean().notNull(),
    correct: boolean().notNull(),
  },
  (t) => [
    uniqueIndex('player_pokemon_identity').on(
      t.ownerId,
      t.generationId,
      t.pokemon,
    ),
  ],
);
export const dailyResults = pgTable(
  'daily_results',
  {
    id: uuid().primaryKey(),
    ...scope(),
    date: text().notNull(),
    score: integer().notNull(),
    elapsedMilliseconds: integer('elapsed_milliseconds').notNull(),
    completionId: uuid('completion_id').notNull(),
    result: jsonb().$type<RoundCompletion['result']>().notNull(),
    streakCredit: boolean('streak_credit').notNull(),
  },
  (t) => [
    check(
      'daily_score',
      sql`${t.score} >= 0 AND ${t.elapsedMilliseconds} >= 0`,
    ),
    index('daily_ranking').on(t.date, t.score.desc(), t.elapsedMilliseconds),
    uniqueIndex('daily_identity').on(t.ownerId, t.generationId, t.date),
    foreignKey({
      columns: [t.ownerId, t.generationId, t.completionId],
      foreignColumns: [
        completionFacts.ownerId,
        completionFacts.generationId,
        completionFacts.completionId,
      ],
    }),
  ],
);
export const trainingBests = pgTable(
  'training_bests',
  {
    id: uuid().primaryKey(),
    ...scope(),
    mode: text().notNull(),
    scoreVersion: integer('score_version').notNull(),
    completionId: uuid('completion_id').notNull(),
    result: jsonb().$type<RoundCompletion['result']>().notNull(),
  },
  (t) => [
    uniqueIndex('training_best_identity').on(
      t.ownerId,
      t.generationId,
      t.mode,
      t.scoreVersion,
    ),
    foreignKey({
      columns: [t.ownerId, t.generationId, t.completionId],
      foreignColumns: [
        completionFacts.ownerId,
        completionFacts.generationId,
        completionFacts.completionId,
      ],
    }),
  ],
);
export const hallOfFame = pgTable(
  'hall_of_fame',
  {
    id: uuid().primaryKey(),
    ...scope(),
    completionId: uuid('completion_id').notNull(),
    completedAt: text('completed_at').notNull(),
    trainerName: text('trainer_name').notNull(),
    pokemon: jsonb().$type<string[]>().notNull(),
    result: jsonb().$type<RoundCompletion['result']>().notNull(),
  },
  (t) => [
    uniqueIndex('hall_identity').on(t.ownerId, t.generationId, t.completionId),
    foreignKey({
      columns: [t.ownerId, t.generationId, t.completionId],
      foreignColumns: [
        completionFacts.ownerId,
        completionFacts.generationId,
        completionFacts.completionId,
      ],
    }),
  ],
);
export const syncIssues = pgTable(
  'sync_issues',
  {
    id: uuid().primaryKey(),
    ...scope(),
    operationId: uuid('operation_id').notNull(),
    reason: text().notNull(),
    payload: jsonb().notNull(),
    dismissed: boolean().notNull().default(false),
  },
  (t) => [
    uniqueIndex('issue_identity').on(t.ownerId, t.generationId, t.operationId),
    index('issues_owner').on(t.ownerId),
  ],
);

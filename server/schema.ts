import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { defaultGameSettings } from '../src/domain/settings/game-settings.ts';
import type { RoundData } from '../src/domain/sync/round-facts.ts';
import { user } from './auth-schema.ts';

export * from './auth-schema.ts';

export const player = pgTable(
  'player',
  {
    id: text()
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    code: text().notNull().unique(),
    joinedOn: date('joined_on', { mode: 'string' })
      .notNull()
      .default(sql`CURRENT_DATE`),
    name: text().notNull().default(''),
    avatar: text(),
    partner: text(),
    specialty: text(),
    answerFlow: text('answer_flow')
      .notNull()
      .default(defaultGameSettings.answerFlow),
    timerDisplay: text('timer_display')
      .notNull()
      .default(defaultGameSettings.timerDisplay),
    trainingMode: text('training_mode')
      .notNull()
      .default(defaultGameSettings.trainingMode),
    difficulty: integer().notNull().default(defaultGameSettings.difficulty!),
    questionSelection: text('question_selection')
      .notNull()
      .default(defaultGameSettings.questionSelection!),
    generations: text()
      .array()
      .notNull()
      .default(defaultGameSettings.generations),
    formGroups: text('form_groups')
      .array()
      .notNull()
      .default(defaultGameSettings.formGroups),
    questionTypes: text('question_types')
      .array()
      .notNull()
      .default(defaultGameSettings.questionTypes),
    autoTypes: text('auto_types').array(),
  },
  (table) => [
    check('player_code_format', sql`${table.code} ~ '^[A-F0-9]{16}$'`),
    check('player_name_length', sql`length(${table.name}) <= 20`),
    check('player_difficulty', sql`${table.difficulty} BETWEEN 1 AND 5`),
    check(
      'player_answer_flow',
      sql`${table.answerFlow} IN ('manual','auto','instant')`,
    ),
    check(
      'player_timer_display',
      sql`${table.timerDisplay} IN ('hidden','seconds','milliseconds')`,
    ),
    check(
      'player_training_mode',
      sql`${table.trainingMode} IN ('league','custom')`,
    ),
    check(
      'player_question_selection',
      sql`${table.questionSelection} IN ('automatic','custom')`,
    ),
  ],
);

export const round = pgTable(
  'round',
  {
    id: uuid().primaryKey(),
    playerId: text('player_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    mode: text().notNull(),
    day: date({ mode: 'string' }),
    puzzleId: text('puzzle_id'),
    startedOn: date('started_on', { mode: 'string' }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    credited: boolean().notNull(),
    data: jsonb().$type<RoundData>().notNull(),
  },
  (table) => [
    check('round_mode', sql`${table.mode} IN ('training','daily','league')`),
    check(
      'round_daily_fields',
      sql`CASE WHEN ${table.mode} = 'daily' THEN ${table.day} IS NOT NULL AND ${table.puzzleId} IS NOT NULL AND ${table.startedOn} IS NOT NULL ELSE ${table.day} IS NULL AND ${table.puzzleId} IS NULL AND ${table.startedOn} IS NULL END`,
    ),
    check(
      'round_other_credited',
      sql`${table.mode} = 'daily' OR ${table.credited}`,
    ),
    index('round_history').on(
      table.playerId,
      table.completedAt.desc(),
      table.id,
    ),
    index('round_daily_board').on(table.day, table.puzzleId),
    uniqueIndex('round_credited_daily')
      .on(table.playerId, table.day)
      .where(sql`${table.mode} = 'daily' AND ${table.credited}`),
  ],
);

export const roundScore = pgTable(
  'round_score',
  {
    roundId: uuid('round_id')
      .primaryKey()
      .references(() => round.id, { onDelete: 'cascade' }),
    score: integer().notNull(),
    elapsedMs: integer('elapsed_ms').notNull(),
  },
  (table) => [
    check(
      'round_score_nonnegative',
      sql`${table.score} >= 0 AND ${table.elapsedMs} >= 0`,
    ),
  ],
);

export const dataset = pgTable('dataset', {
  id: uuid().primaryKey(),
  playerId: text('player_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const op = pgTable(
  'op',
  {
    id: uuid().primaryKey(),
    playerId: text('player_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    hash: text().notNull(),
    status: text().notNull(),
    reason: text(),
  },
  (table) => [
    check('op_status', sql`${table.status} IN ('accepted','rejected')`),
  ],
);

export const friend = pgTable(
  'friend',
  {
    id: uuid().primaryKey(),
    fromId: text('from_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    toId: text('to_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text().notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('friend_distinct', sql`${table.fromId} <> ${table.toId}`),
    check(
      'friend_status',
      sql`${table.status} IN ('pending','accepted','declined','cancelled','removed')`,
    ),
    uniqueIndex('friend_active_pair')
      .on(
        sql`least(${table.fromId}, ${table.toId})`,
        sql`greatest(${table.fromId}, ${table.toId})`,
      )
      .where(sql`${table.status} IN ('pending','accepted')`),
    index('friend_from').on(table.fromId, table.id),
    index('friend_to').on(table.toId, table.id),
  ],
);

export const mailBudget = pgTable(
  'mail_budget',
  {
    id: integer().primaryKey().default(1),
    day: date({ mode: 'string' }).notNull(),
    dayCount: integer('day_count').notNull().default(0),
    cycle: text().notNull(),
    cycleCount: integer('cycle_count').notNull().default(0),
  },
  (table) => [
    check('mail_budget_singleton', sql`${table.id} = 1`),
    check(
      'mail_budget_counts',
      sql`${table.dayCount} >= 0 AND ${table.cycleCount} >= 0`,
    ),
  ],
);

export const instance = pgTable(
  'instance',
  {
    id: integer().primaryKey().default(1),
    epoch: uuid().notNull(),
  },
  (table) => [check('instance_singleton', sql`${table.id} = 1`)],
);

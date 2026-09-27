import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';

export * from './auth-schema.ts';

export const player = pgTable(
  'player',
  {
    id: text()
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    code: text().notNull().unique(),
  },
  (table) => [
    check('player_code_format', sql`${table.code} ~ '^[A-F0-9]{16}$'`),
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

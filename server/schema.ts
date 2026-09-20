import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export * from './auth-schema.ts';
export * from './progress-schema.ts';
export * from './friend-schema.ts';

export const testMailbox = pgTable('test_mailbox', {
  email: text().primaryKey(),
  code: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emailBudget = pgTable('email_budget', {
  id: text().primaryKey(),
  day: text().notNull(),
  cycle: text().notNull(),
  dailyCount: integer('daily_count').notNull(),
  cycleCount: integer('cycle_count').notNull(),
});

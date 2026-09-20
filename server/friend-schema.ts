import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';

export const socialPlayers = pgTable(
  'social_players',
  {
    id: text()
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    code: text().notNull().unique(),
  },
  (table) => [
    check('social_player_code', sql`${table.code} ~ '^[A-F0-9]{16}$'`),
  ],
);

export const friendRequestStates = [
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'removed',
] as const;

export const friendRequests = pgTable(
  'friend_requests',
  {
    id: uuid().primaryKey(),
    userLow: text('user_low')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userHigh: text('user_high')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    senderId: text('sender_id').notNull(),
    status: text({ enum: friendRequestStates }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'friend_request_pair_order',
      sql`${table.userLow} COLLATE "C" < ${table.userHigh} COLLATE "C"`,
    ),
    check(
      'friend_request_sender',
      sql`${table.senderId} IN (${table.userLow}, ${table.userHigh})`,
    ),
    check(
      'friend_request_status',
      sql`${table.status} IN ('pending', 'accepted', 'declined', 'cancelled', 'removed')`,
    ),
    uniqueIndex('friend_request_active_pair')
      .on(table.userLow, table.userHigh)
      .where(sql`${table.status} IN ('pending', 'accepted')`),
    index('friend_request_low_status').on(
      table.userLow,
      table.status,
      table.id,
    ),
    index('friend_request_high_status').on(
      table.userHigh,
      table.status,
      table.id,
    ),
  ],
);

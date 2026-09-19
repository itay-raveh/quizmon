import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { EmailDeliveryError } from './email.ts';

import { sql } from 'drizzle-orm';

export const DAILY_EMAIL_LIMIT = 200;
export const CYCLE_EMAIL_LIMIT = 3_000;

export async function reserveEmail(db: NodePgDatabase, id = 'quizmon') {
  // The billing cycle starts on the 10th. Reserve before sending, including failures.
  // https://www.postgresql.org/docs/18/sql-insert.html#SQL-ON-CONFLICT
  const result = await db.execute(sql`
    INSERT INTO email_budget (id, day, cycle, daily_count, cycle_count)
    VALUES (${id}, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
      to_char((now() AT TIME ZONE 'UTC') - interval '9 days', 'YYYY-MM'), 1, 1)
    ON CONFLICT (id) DO UPDATE SET
      day = EXCLUDED.day,
      cycle = EXCLUDED.cycle,
      daily_count = CASE WHEN email_budget.day = EXCLUDED.day
        THEN email_budget.daily_count + 1 ELSE 1 END,
      cycle_count = CASE WHEN email_budget.cycle = EXCLUDED.cycle
        THEN email_budget.cycle_count + 1 ELSE 1 END
    WHERE (email_budget.day <> EXCLUDED.day OR email_budget.daily_count < ${DAILY_EMAIL_LIMIT})
      AND (email_budget.cycle <> EXCLUDED.cycle OR email_budget.cycle_count < ${CYCLE_EMAIL_LIMIT})
    RETURNING id
  `);
  if (result.rowCount !== 1) throw new EmailDeliveryError(true);
}

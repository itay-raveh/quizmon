import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { EmailDeliveryError } from './email.ts';

import { sql } from 'drizzle-orm';

export const DAILY_EMAIL_LIMIT = 200;
export const CYCLE_EMAIL_LIMIT = 3_000;

export async function reserveEmail(db: NodePgDatabase) {
  // The billing cycle starts on the 10th. Reserve before sending, including failures.
  // https://www.postgresql.org/docs/18/sql-insert.html#SQL-ON-CONFLICT
  const result = await db.execute(sql`
    INSERT INTO mail_budget (id, day, cycle, day_count, cycle_count)
    VALUES (1, (now() AT TIME ZONE 'UTC')::date,
      to_char((now() AT TIME ZONE 'UTC') - interval '9 days', 'YYYY-MM'), 1, 1)
    ON CONFLICT (id) DO UPDATE SET
      day = EXCLUDED.day,
      cycle = EXCLUDED.cycle,
      day_count = CASE WHEN mail_budget.day = EXCLUDED.day
        THEN mail_budget.day_count + 1 ELSE 1 END,
      cycle_count = CASE WHEN mail_budget.cycle = EXCLUDED.cycle
        THEN mail_budget.cycle_count + 1 ELSE 1 END
    WHERE (mail_budget.day <> EXCLUDED.day OR mail_budget.day_count < ${DAILY_EMAIL_LIMIT})
      AND (mail_budget.cycle <> EXCLUDED.cycle OR mail_budget.cycle_count < ${CYCLE_EMAIL_LIMIT})
    RETURNING id
  `);
  if (result.rowCount !== 1) throw new EmailDeliveryError(true);
}

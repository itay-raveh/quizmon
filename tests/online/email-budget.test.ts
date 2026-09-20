import { localSync } from '../../scripts/dev/local-sync.ts';
import { drizzle } from 'drizzle-orm/node-postgres';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Pool } from 'pg';
import { createAccountApi } from '../../server/api.ts';
import {
  CYCLE_EMAIL_LIMIT,
  DAILY_EMAIL_LIMIT,
  reserveEmail,
} from '../../server/email-budget.ts';
import { EmailDeliveryError } from '../../server/email.ts';
import { localEnv } from '../../scripts/dev/local-env.ts';

const connectionString =
  'postgresql://postgres:unused@127.0.0.1:5548/quizmon_pilot';
await test('PostgreSQL serializes concurrent email reservations and preserves failed-send charges', async (t) => {
  const pool = new Pool({ connectionString, max: 10 });
  const db = drizzle(pool);
  const id = `budget-test-${randomUUID()}`;
  t.after(async () => {
    await pool.query('DELETE FROM email_budget WHERE id=$1', [id]);
    await pool.end();
  });
  await reserveEmail(db, id);
  await pool.query(
    'UPDATE email_budget SET daily_count=$2, cycle_count=$2 WHERE id=$1',
    [id, DAILY_EMAIL_LIMIT - 1],
  );
  const results = await Promise.allSettled(
    Array.from({ length: 30 }, () => reserveEmail(db, id)),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  for (const r of results)
    if (r.status === 'rejected')
      assert.ok(r.reason instanceof EmailDeliveryError && r.reason.limited);
  const counts = async () =>
    (
      await pool.query<{ daily_count: number; cycle_count: number }>(
        'SELECT daily_count, cycle_count FROM email_budget WHERE id=$1',
        [id],
      )
    ).rows[0];
  assert.deepEqual(await counts(), {
    daily_count: DAILY_EMAIL_LIMIT,
    cycle_count: DAILY_EMAIL_LIMIT,
  });
  await pool.query(
    "UPDATE email_budget SET day='2000-01-01', cycle_count=$2 WHERE id=$1",
    [id, CYCLE_EMAIL_LIMIT - 1],
  );
  await reserveEmail(db, id);
  await assert.rejects(reserveEmail(db, id), EmailDeliveryError);
  assert.deepEqual(await counts(), {
    daily_count: 1,
    cycle_count: CYCLE_EMAIL_LIMIT,
  });
  await pool.query(
    "UPDATE email_budget SET day='2000-01-01', cycle='2000-01' WHERE id=$1",
    [id],
  );
  await reserveEmail(db, id);
  assert.deepEqual(await counts(), { daily_count: 1, cycle_count: 1 });

  let sends = 0;
  const origin = 'http://localhost:4188';
  const app = createAccountApi({
    sync: localSync,
    connectionString,
    origin,
    secret: localEnv.BETTER_AUTH_SECRET!,
    emailBudgetId: id,
    mail: {
      mode: 'cloudflare',
      deliver: () => {
        sends++;
        return Promise.reject(new Error('Ambiguous outcome'));
      },
    },
  });
  const send = () =>
    app.request(`${origin}/api/auth/email-otp/send-verification-otp`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `quota-${randomUUID()}@example.test`,
        type: 'sign-in',
      }),
    });
  assert.equal((await send()).status, 503);
  assert.equal(sends, 1);
  assert.deepEqual(await counts(), { daily_count: 2, cycle_count: 2 });
  await pool.query('UPDATE email_budget SET cycle_count=$2 WHERE id=$1', [
    id,
    CYCLE_EMAIL_LIMIT,
  ]);
  assert.equal((await send()).status, 429);
  assert.equal(sends, 1);
});

await test('100 users can reserve a sign-in code and one resend each before the daily cap closes', async (t) => {
  const pool = new Pool({ connectionString, max: 10 });
  const db = drizzle(pool);
  const id = `capacity-test-${randomUUID()}`;
  t.after(async () => {
    await pool.query('DELETE FROM email_budget WHERE id=$1', [id]);
    await pool.end();
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const results = await Promise.allSettled(
      Array.from({ length: 100 }, () => reserveEmail(db, id)),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 100);
  }
  await assert.rejects(reserveEmail(db, id), EmailDeliveryError);
  const { rows } = await pool.query(
    'SELECT daily_count, cycle_count FROM email_budget WHERE id=$1',
    [id],
  );
  assert.deepEqual(rows, [{ daily_count: 200, cycle_count: 200 }]);
});

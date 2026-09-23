import { localSync } from '../../scripts/dev/local-sync.ts';
import { localEnv } from '../../scripts/dev/local-env.ts';
import { drizzle } from 'drizzle-orm/node-postgres';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { testDatabase } from './account-fixture.ts';
import { createAccountApi } from '../../server/api.ts';
import {
  DAILY_EMAIL_LIMIT,
  CYCLE_EMAIL_LIMIT,
  reserveEmail,
} from '../../server/email-budget.ts';
import { EmailDeliveryError } from '../../server/email.ts';

await test('email reservations are atomic and failed sends remain charged', async (t) => {
  const database = await testDatabase();
  const { pool, connectionString } = database;
  t.after(database.close);
  const db = drizzle(pool);
  await reserveEmail(db);
  await pool.query(
    'UPDATE mail_budget SET day_count=$1, cycle_count=$1 WHERE id=1',
    [DAILY_EMAIL_LIMIT - 1],
  );
  const results = await Promise.allSettled(
    Array.from({ length: 30 }, () => reserveEmail(db)),
  );
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  for (const result of results)
    if (result.status === 'rejected')
      assert.ok(
        result.reason instanceof EmailDeliveryError && result.reason.limited,
      );
  const counts = async () =>
    (
      await pool.query<{ day_count: number; cycle_count: number }>(
        'SELECT day_count, cycle_count FROM mail_budget WHERE id=1',
      )
    ).rows[0];
  assert.deepEqual(await counts(), {
    day_count: DAILY_EMAIL_LIMIT,
    cycle_count: DAILY_EMAIL_LIMIT,
  });
  await pool.query(
    "UPDATE mail_budget SET day='2000-01-01', cycle_count=$1 WHERE id=1",
    [CYCLE_EMAIL_LIMIT - 1],
  );
  await reserveEmail(db);
  await assert.rejects(reserveEmail(db), EmailDeliveryError);
  assert.deepEqual(await counts(), {
    day_count: 1,
    cycle_count: CYCLE_EMAIL_LIMIT,
  });
  await pool.query(
    "UPDATE mail_budget SET day='2000-01-01', cycle='2000-01' WHERE id=1",
  );
  await reserveEmail(db);
  assert.deepEqual(await counts(), { day_count: 1, cycle_count: 1 });

  let sends = 0;
  const origin = 'http://localhost:4188';
  const app = createAccountApi({
    sync: localSync,
    connectionString,
    origin,
    secret: localEnv.BETTER_AUTH_SECRET!,
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
  assert.deepEqual(await counts(), { day_count: 2, cycle_count: 2 });
  await pool.query('UPDATE mail_budget SET cycle_count=$1 WHERE id=1', [
    CYCLE_EMAIL_LIMIT,
  ]);
  assert.equal((await send()).status, 429);
  assert.equal(sends, 1);
});

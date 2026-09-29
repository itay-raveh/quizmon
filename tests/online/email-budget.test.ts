import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MongoClient } from 'mongodb';
import { localSync } from '../../scripts/dev/local-sync.ts';
import { localEnv } from '../../scripts/dev/local-env.ts';
import { createAccountApi } from '../../server/api.ts';
import {
  DAILY_EMAIL_LIMIT,
  CYCLE_EMAIL_LIMIT,
  reserveEmail,
} from '../../server/email-budget.ts';
import { EmailDeliveryError } from '../../server/email.ts';

await test('email reservations are atomic and failed sends remain charged', async (t) => {
  const name = `quizmon_budget_${crypto.randomUUID().replaceAll('-', '')}`;
  const mongoUrl = `mongodb://127.0.0.1:27018/${name}?directConnection=true`;
  const mongo = await new MongoClient(mongoUrl).connect();
  const db = mongo.db();
  t.after(async () => {
    await db.dropDatabase();
    await mongo.close();
  });
  await reserveEmail(db);
  const budget = db.collection<{
    _id: number;
    day: string;
    dayCount: number;
    cycle: string;
    cycleCount: number;
  }>('mail_budget');
  await budget.updateOne(
    { _id: 1 },
    {
      $set: {
        dayCount: DAILY_EMAIL_LIMIT - 1,
        cycleCount: DAILY_EMAIL_LIMIT - 1,
      },
    },
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
  const counts = async () => {
    const row = await budget.findOne({ _id: 1 });
    return { dayCount: row?.dayCount, cycleCount: row?.cycleCount };
  };
  assert.deepEqual(await counts(), {
    dayCount: DAILY_EMAIL_LIMIT,
    cycleCount: DAILY_EMAIL_LIMIT,
  });
  await budget.updateOne(
    { _id: 1 },
    { $set: { day: '2000-01-01', cycleCount: CYCLE_EMAIL_LIMIT - 1 } },
  );
  await reserveEmail(db);
  await assert.rejects(reserveEmail(db), EmailDeliveryError);
  assert.deepEqual(await counts(), {
    dayCount: 1,
    cycleCount: CYCLE_EMAIL_LIMIT,
  });
  await budget.updateOne(
    { _id: 1 },
    { $set: { day: '2000-01-01', cycle: '2000-01' } },
  );
  await reserveEmail(db);
  assert.deepEqual(await counts(), { dayCount: 1, cycleCount: 1 });

  let sends = 0;
  const origin = 'http://localhost:4188';
  const app = createAccountApi({
    sync: localSync,
    mongoUrl,
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
        email: `quota-${crypto.randomUUID()}@example.test`,
        type: 'sign-in',
      }),
    });
  assert.equal((await send()).status, 503);
  assert.equal(sends, 1);
  assert.deepEqual(await counts(), { dayCount: 2, cycleCount: 2 });
  await budget.updateOne(
    { _id: 1 },
    { $set: { cycleCount: CYCLE_EMAIL_LIMIT } },
  );
  assert.equal((await send()).status, 429);
  assert.equal(sends, 1);
});

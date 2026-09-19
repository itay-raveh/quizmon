import { localSync } from '../../scripts/dev/local-sync.ts';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Client } from 'pg';
import { createAccountApi } from '../../server/api.ts';
import {
  EmailDeliveryError,
  cloudflareBindingDelivery,
  cloudflareRestDelivery,
  type CodeDelivery,
} from '../../server/email.ts';
import { localEnv } from '../../scripts/dev/local-env.ts';

const from = 'quizmon@example.test';
const recipient = 'player@example.test';
const code = '123456';
const origin = 'http://localhost:4188';
const connectionString =
  'postgresql://postgres:unused@127.0.0.1:5548/quizmon_pilot';

await test('Worker binding rejects missing acknowledgement and normalizes quota errors', async () => {
  const deliver = cloudflareBindingDelivery(
    {
      send: () => Promise.resolve({ messageId: 'provider-message-id' }),
    },
    from,
  );
  await deliver(recipient, code);
  for (const failureCode of [
    'E_RATE_LIMIT_EXCEEDED',
    'E_DAILY_LIMIT_EXCEEDED',
    'E_SENDER_NOT_VERIFIED',
  ]) {
    const failure = cloudflareBindingDelivery(
      {
        send: () =>
          Promise.reject(
            Object.assign(
              new Error(`Private provider detail for ${recipient}`),
              { code: failureCode },
            ),
          ),
      },
      from,
    );
    await assert.rejects(failure(recipient, code), (error: unknown) => {
      assert.ok(error instanceof EmailDeliveryError);
      assert.equal(error.limited, failureCode !== 'E_SENDER_NOT_VERIFIED');
      assert.ok(!error.message.includes(recipient));
      return true;
    });
  }
  await assert.rejects(
    cloudflareBindingDelivery(
      {
        send: () => Promise.resolve({ messageId: '' }),
      },
      from,
    )(recipient, code),
    EmailDeliveryError,
  );
});

await test('REST accepts recipient-specific queued/delivered outcomes and rejects bounces or unknown outcomes', async () => {
  const config = { accountId: 'a'.repeat(32), token: 'test-token', from };
  for (const accepted of ['delivered', 'queued']) {
    await cloudflareRestDelivery(config, () =>
      Promise.resolve(
        Response.json({
          success: true,
          result: {
            delivered: [],
            queued: [],
            permanent_bounces: [],
            [accepted]: [recipient],
          },
        }),
      ),
    )(recipient, code);
  }
  for (const result of [
    { delivered: [], queued: [], permanent_bounces: [recipient] },
    { delivered: [], queued: [], permanent_bounces: [] },
    {
      delivered: ['someone-else@example.test'],
      queued: [],
      permanent_bounces: [],
    },
    { messageId: 'not-the-REST-contract' },
  ]) {
    await assert.rejects(
      cloudflareRestDelivery(config, () =>
        Promise.resolve(
          Response.json({
            success: true,
            result,
          }),
        ),
      )(recipient, code),
      EmailDeliveryError,
    );
  }
  await assert.rejects(
    cloudflareRestDelivery(config, () =>
      Promise.resolve(Response.json({ success: false }, { status: 429 })),
    )(recipient, code),
    (error: unknown) => error instanceof EmailDeliveryError && error.limited,
  );
  let attempts = 0;
  await assert.rejects(
    cloudflareRestDelivery(config, () => {
      attempts++;
      return Promise.reject(
        new Error('Ambiguous network response with private details'),
      );
    })(recipient, code),
    EmailDeliveryError,
  );
  assert.equal(attempts, 1);
});

function apiWithDelivery(deliver: CodeDelivery) {
  return createAccountApi({
    sync: localSync,
    connectionString,
    origin,
    secret: localEnv.BETTER_AUTH_SECRET!,
    mail: { mode: 'cloudflare', deliver },
    emailBudgetId: `test-${randomUUID()}`,
  });
}

function post(
  app: ReturnType<typeof apiWithDelivery>,
  path: string,
  body: unknown,
) {
  return app.request(`${origin}/api/auth/${path}`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

await test('Better Auth surfaces delivery failure per request and a later retry can sign in', async () => {
  const email = `failure-${randomUUID()}@example.test`;
  const codes = new Map<string, string>();
  let failing = true;
  const app = apiWithDelivery((address, otp) => {
    if (address === email && failing)
      return Promise.reject(new EmailDeliveryError(true));
    codes.set(address, otp);
    return Promise.resolve();
  });
  const [failed, succeeded] = await Promise.all([
    post(app, 'email-otp/send-verification-otp', { email, type: 'sign-in' }),
    post(app, 'email-otp/send-verification-otp', {
      email: `success-${randomUUID()}@example.test`,
      type: 'sign-in',
    }),
  ]);
  assert.equal(failed.status, 429);
  assert.equal(succeeded.status, 200);
  assert.deepEqual(await failed.json(), {
    code: 'EMAIL_DELIVERY_FAILED',
    message: new EmailDeliveryError(true).message,
  });
  failing = false;
  assert.equal(
    (
      await post(app, 'email-otp/send-verification-otp', {
        email,
        type: 'sign-in',
      })
    ).status,
    200,
  );
  assert.equal(
    (await post(app, 'sign-in/email-otp', { email, otp: codes.get(email) }))
      .status,
    200,
  );
});

await test('real-mail mode has no test mailbox, stores hashed OTPs, and preserves verification and expiry', async (t) => {
  const db = new Client({ connectionString });
  await db.connect();
  t.after(() => db.end());
  const email = `mail-${randomUUID()}@example.test`;
  let sentCode = '';
  const app = apiWithDelivery((_email, otp) => {
    sentCode = otp;
    return Promise.resolve();
  });
  assert.equal(
    (
      await post(app, 'email-otp/send-verification-otp', {
        email: email.toUpperCase(),
        type: 'sign-in',
      })
    ).status,
    200,
  );
  assert.match(sentCode, /^\d{6}$/);
  assert.equal(
    (await app.request(`${origin}/api/dev/mailbox?email=${email}`)).status,
    404,
  );
  assert.equal(
    (await db.query('SELECT 1 FROM test_mailbox WHERE email = $1', [email]))
      .rowCount,
    0,
  );
  const stored = await db.query<{ value: string }>(
    'SELECT value FROM verification WHERE identifier = $1',
    [`sign-in-otp-${email}`],
  );
  assert.equal(stored.rowCount, 1);
  assert.notEqual(stored.rows[0]!.value.split(':')[0], sentCode);
  const wrongCode =
    sentCode.slice(0, -1) + String((Number(sentCode.at(-1)) + 1) % 10);
  assert.equal(
    (await post(app, 'sign-in/email-otp', { email, otp: wrongCode })).status,
    400,
  );
  assert.equal(
    (await post(app, 'sign-in/email-otp', { email, otp: sentCode })).status,
    200,
  );
  assert.equal(
    (await post(app, 'sign-in/email-otp', { email, otp: sentCode })).status,
    400,
  );

  assert.equal(
    (
      await post(app, 'email-otp/send-verification-otp', {
        email,
        type: 'sign-in',
      })
    ).status,
    200,
  );
  await db.query(
    "UPDATE verification SET expires_at = now() - interval '1 second' WHERE identifier = $1",
    [`sign-in-otp-${email}`],
  );
  assert.equal(
    (await post(app, 'sign-in/email-otp', { email, otp: sentCode })).status,
    400,
  );
  assert.equal(
    (
      await post(app, 'email-otp/send-verification-otp', {
        email,
        type: 'forget-password',
      })
    ).status,
    400,
  );
});

await test('an ambiguous delivery failure returns a recoverable 503 without provider details', async () => {
  const app = apiWithDelivery(() =>
    Promise.reject(new Error('Private provider response')),
  );
  const response = await post(app, 'email-otp/send-verification-otp', {
    email: `timeout-${randomUUID()}@example.test`,
    type: 'sign-in',
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    code: 'EMAIL_DELIVERY_FAILED',
    message: new EmailDeliveryError().message,
  });
});

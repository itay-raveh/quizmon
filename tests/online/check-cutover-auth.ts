import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { emailOTP } from 'better-auth/plugins';
import { testDatabase, testMongoUrl } from './account-fixture.ts';
import { isRecord } from '../../src/lib/validation.ts';

const run = promisify(execFile);
const postgres = await testDatabase();
const appName = `cutover_auth_${crypto.randomUUID().replaceAll('-', '')}`;
const mongoUrl = testMongoUrl('quizmon');
const mongo = await new MongoClient(mongoUrl).connect();
try {
  const { pool } = postgres;
  await pool.query(
    `INSERT INTO "user" (id, name, email, created_at, updated_at)
     VALUES ('trainer_a', 'A', 'a@example.test', '2026-09-29 12:00:00', '2026-09-29 12:00:00'),
            ('trainer_b', 'B', 'b@example.test', '2026-09-29 12:01:00', '2026-09-29 12:01:00')`,
  );
  await pool.query(
    `INSERT INTO player (id, code) VALUES
     ('trainer_a', '0000000000000001'), ('trainer_b', '0000000000000002')`,
  );
  await pool.query(
    `INSERT INTO session (id, token, expires_at, created_at, updated_at, user_id)
     VALUES ('session_a', 'token_a', '2030-01-01 12:00:00', '2026-09-29 12:00:00', '2026-09-29 12:00:00', 'trainer_a')`,
  );
  await pool.query(
    `INSERT INTO friend (id, from_id, to_id, status, created_at, updated_at)
     VALUES ('00000000-0000-4000-8000-000000000001', 'trainer_a', 'trainer_b', 'accepted', now(), now())`,
  );
  await pool.query(
    `INSERT INTO mail_budget (id, day, cycle, day_count, cycle_count)
     VALUES (1, '2026-09-29', '2026-09', 1, 1)`,
  );
  const command = fileURLToPath(
    new URL('../../server/cutover-import-auth.ts', import.meta.url),
  );
  const env = {
    ...process.env,
    CUTOVER_POSTGRES_URL: postgres.connectionString,
    CUTOVER_MONGO_URL: mongoUrl,
    CUTOVER_APP_DB: appName,
  };
  const dry = await run(process.execPath, [command], { env });
  const report = JSON.parse(dry.stdout) as Record<string, unknown>;
  assert.equal(report.applied, false);
  assert.equal((report.counts as Record<string, number>).user, 2);
  const first = await run(process.execPath, [command, '--apply'], { env });
  const second = await run(process.execPath, [command, '--apply'], { env });
  assert.equal(first.stdout, second.stdout);
  const app = mongo.db(appName);
  const user = await app
    .collection<{ _id: string; createdAt: Date }>('user')
    .findOne({ _id: 'trainer_a' });
  const session = await app
    .collection<{ _id: string; expiresAt: Date; userId: string }>('session')
    .findOne({ _id: 'session_a' });
  const friend = await app
    .collection<{ _id: string; pairKey: string }>('friend')
    .findOne({
      _id: '00000000-0000-4000-8000-000000000001',
    });
  assert.equal(user?.createdAt?.toISOString(), '2026-09-29T12:00:00.000Z');
  assert.equal(session?.expiresAt?.toISOString(), '2030-01-01T12:00:00.000Z');
  assert.equal(session?.userId, 'trainer_a');
  assert.equal(friend?.pairKey, 'trainer_a/trainer_b');
  assert.equal(
    (
      await app
        .collection<{ _id: number; day: string }>('mail_budget')
        .findOne({ _id: 1 })
    )?.day,
    '2026-09-29',
  );
  assert.ok(
    (await app.collection('user').listIndexes().toArray()).some(
      (index: unknown) =>
        isRecord(index) &&
        index.name === 'user_email_uidx' &&
        index.unique === true,
    ),
  );
  assert.ok(
    (await app.collection('friend').listIndexes().toArray()).some(
      (index: unknown) =>
        isRecord(index) &&
        index.name === 'friend_active_pair_uidx' &&
        index.unique === true,
    ),
  );
  let otp = '';
  const auth = betterAuth({
    baseURL: 'http://localhost:4188',
    secret: 'cutover-integration-secret-123456',
    database: mongodbAdapter(app, { client: mongo }),
    advanced: { database: { generateId: () => crypto.randomUUID() } },
    plugins: [
      emailOTP({
        sendVerificationOTP: ({ otp: sent }) => {
          otp = sent;
          return Promise.resolve();
        },
      }),
    ],
  });
  const request = (path: string, body: object) =>
    auth.handler(
      new Request(`http://localhost:4188/api/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  assert.equal(
    (
      await request('email-otp/send-verification-otp', {
        email: 'a@example.test',
        type: 'sign-in',
      })
    ).status,
    200,
  );
  assert.ok(otp);
  const signedIn = await request('sign-in/email-otp', {
    email: 'a@example.test',
    otp,
  });
  assert.equal(signedIn.status, 200);
  const signed = (await signedIn.json()) as unknown;
  assert.ok(isRecord(signed) && isRecord(signed.user));
  assert.equal(signed.user.id, 'trainer_a');
  console.log('Cutover auth/social dry run and idempotent import passed.');
} finally {
  await mongo.db(appName).dropDatabase();
  await mongo.close();
  await postgres.close();
}

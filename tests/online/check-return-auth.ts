import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { MongoClient, type Document } from 'mongodb';
import { testDatabase } from './account-fixture.ts';

const postgres = await testDatabase();
const name = `quizmon_return_${crypto.randomUUID().replaceAll('-', '')}`;
const mongoUrl = `mongodb://127.0.0.1:27018/${name}?directConnection=true`;
const mongo = await new MongoClient(mongoUrl).connect();
const db = mongo.db();
const now = new Date('2026-09-30T08:00:00.000Z');
const run = (...args: string[]) =>
  execFileSync(
    process.execPath,
    ['server/return-auth-to-postgres.ts', ...args],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        RETURN_MONGO_URL: mongoUrl,
        ...(args.includes('--apply')
          ? { RETURN_POSTGRES_URL: postgres.connectionString }
          : { RETURN_POSTGRES_URL: '' }),
        RETURN_APP_DB: name,
      },
    },
  );

try {
  await postgres.pool.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ('stale', 'Old', 'old@example.test', false, $1, $1)`,
    [now.toISOString()],
  );
  await db.collection<Document & { _id: string }>('user').insertMany([
    {
      _id: 'trainer_a',
      name: 'A',
      email: 'a@example.test',
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'trainer_b',
      name: 'B',
      email: 'b@example.test',
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  await db.collection<Document & { _id: string }>('session').insertOne({
    _id: 'session_a',
    userId: 'trainer_a',
    token: 'secret-token',
    expiresAt: new Date('2026-10-01T08:00:00.000Z'),
    createdAt: now,
    updatedAt: now,
    ipAddress: null,
    userAgent: null,
  });
  await db.collection<Document & { _id: string }>('account').insertOne({
    _id: 'provider_a',
    accountId: 'a@example.test',
    providerId: 'credential',
    userId: 'trainer_a',
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: null,
    createdAt: now,
    updatedAt: now,
  });
  await db.collection<Document & { _id: string }>('jwks').insertOne({
    _id: 'key_a',
    publicKey: 'public',
    privateKey: 'private',
    createdAt: now,
    expiresAt: null,
    alg: 'EdDSA',
    crv: 'Ed25519',
  });
  const friendId = crypto.randomUUID();
  await db.collection<Document & { _id: string }>('friend').insertOne({
    _id: friendId,
    fromId: 'trainer_a',
    toId: 'trainer_b',
    pairKey: 'trainer_a/trainer_b',
    status: 'accepted',
    createdAt: now,
    updatedAt: now,
  });
  await db.collection<Document & { _id: number }>('mail_budget').insertOne({
    _id: 1,
    day: '2026-09-30',
    dayCount: 7,
    cycle: '2026-09',
    cycleCount: 19,
  });
  assert.match(run(), /"applied":false/);
  assert.equal(
    (
      await postgres.pool.query<{ count: string }>(
        'SELECT count(*) FROM "user"',
      )
    ).rows[0]?.count,
    '1',
  );
  assert.match(run('--apply'), /Auth and social return import complete/);
  assert.match(run('--apply'), /Auth and social return import complete/);
  const users = await postgres.pool.query<{ id: string }>(
    'SELECT id FROM "user" ORDER BY id',
  );
  assert.deepEqual(
    users.rows.map((row) => row.id),
    ['trainer_a', 'trainer_b'],
  );
  const session = await postgres.pool.query<{ token: string; user_id: string }>(
    'SELECT token, user_id FROM session',
  );
  assert.deepEqual(session.rows, [
    { token: 'secret-token', user_id: 'trainer_a' },
  ]);
  const friend = await postgres.pool.query<{ id: string; status: string }>(
    'SELECT id, status FROM friend',
  );
  assert.deepEqual(friend.rows, [{ id: friendId, status: 'accepted' }]);
  const budget = await postgres.pool.query<{
    day_count: number;
    cycle_count: number;
  }>('SELECT day_count, cycle_count FROM mail_budget');
  assert.deepEqual(budget.rows, [{ day_count: 7, cycle_count: 19 }]);
  const keys = await postgres.pool.query<{ private_key: string }>(
    'SELECT private_key FROM jwks',
  );
  assert.deepEqual(keys.rows, [{ private_key: 'private' }]);
  console.log('Current Mongo auth and social data returned to Postgres.');
} finally {
  await db.dropDatabase();
  await mongo.close();
  await postgres.close();
}

import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { MongoClient } from 'mongodb';
import { Client, types } from 'pg';

// Treat legacy timezone-free auth timestamps as UTC after live expiry checks.
// https://node-postgres.com/features/types
types.setTypeParser(1114, (value) => new Date(value.replace(' ', 'T') + 'Z'));
types.setTypeParser(1082, (value) => value);

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--apply'))
  throw new Error('Usage: node server/cutover-import-auth.ts [--apply]');
const postgresUrl = process.env.CUTOVER_POSTGRES_URL;
const mongoUrl = process.env.CUTOVER_MONGO_URL;
if (!postgresUrl || !mongoUrl)
  throw new Error('Set CUTOVER_POSTGRES_URL and CUTOVER_MONGO_URL.');
const appName = process.env.CUTOVER_APP_DB ?? 'quizmon_app';
const tables = [
  'user',
  'session',
  'account',
  'verification',
  'jwks',
  'friend',
  'mail_budget',
  'player',
] as const;

const postgres = new Client({ connectionString: postgresUrl });
await postgres.connect();
try {
  const rows = {} as Record<(typeof tables)[number], Record<string, unknown>[]>;
  for (const table of tables)
    rows[table] = (await postgres.query(`SELECT * FROM "${table}" ORDER BY id`))
      .rows as Record<string, unknown>[];
  const ids = new Set(rows.user.map((row) => row.id));
  if (!ids.size || ids.size !== rows.user.length)
    throw new Error('The source has no users or duplicate user IDs.');
  for (const table of ['session', 'account'] as const)
    if (rows[table].some((row) => !ids.has(row.user_id)))
      throw new Error(`${table} refers to a missing user.`);
  if (
    rows.friend.some((row) => !ids.has(row.from_id) || !ids.has(row.to_id)) ||
    rows.player.some((row) => !ids.has(row.id)) ||
    rows.player.length !== ids.size ||
    rows.mail_budget.length > 1
  )
    throw new Error('Social or mail data does not match the user inventory.');

  const documents = Object.fromEntries(
    tables
      .filter((table) => table !== 'player')
      .map((table) => [
        table,
        rows[table].map((row) => {
          const id = row.id;
          if (
            (typeof id !== 'string' && table !== 'mail_budget') ||
            (table === 'mail_budget' && id !== 1)
          )
            throw new Error(`${table} has an invalid ID.`);
          const result: Record<string, unknown> & { _id: string | number } = {
            _id: id as string | number,
          };
          for (const [key, value] of Object.entries(row))
            if (key !== 'id')
              result[
                key.replace(/_([a-z])/g, (_, letter: string) =>
                  letter.toUpperCase(),
                )
              ] = value;
          if (table === 'friend') {
            if (
              typeof result.fromId !== 'string' ||
              typeof result.toId !== 'string'
            )
              throw new Error('A friend request has invalid user IDs.');
            const pair = [result.fromId, result.toId].sort();
            result.pairKey = pair.join('/');
          }
          return result;
        }),
      ]),
  ) as Record<
    Exclude<(typeof tables)[number], 'player'>,
    (Record<string, unknown> & { _id: string | number })[]
  >;
  const counts = Object.fromEntries(
    Object.entries(documents).map(([table, values]) => [table, values.length]),
  );
  const hash = createHash('sha256')
    .update(JSON.stringify(documents))
    .digest('hex');
  console.log(
    JSON.stringify({
      target: appName,
      counts,
      sha256: hash,
      applied: args.includes('--apply'),
    }),
  );
  if (args.includes('--apply')) {
    const mongo = await new MongoClient(mongoUrl).connect();
    try {
      const db = mongo.db(appName);
      for (const [name, values] of Object.entries(documents)) {
        const collection = db.collection<{ _id: string | number }>(name);
        const sourceIds = new Set(values.map((value) => value._id));
        for await (const existing of collection.find(
          {},
          { projection: { _id: 1 } },
        ))
          if (!sourceIds.has(existing._id))
            throw new Error(`${name} contains a target-only record.`);
      }
      for (const [name, values] of Object.entries(documents)) {
        const collection = db.collection<{ _id: string | number }>(name);
        for (const value of values) {
          const existing = await collection.findOne({ _id: value._id });
          if (!existing) await collection.insertOne(value);
          else if (!isDeepStrictEqual(existing, value))
            throw new Error(`${name} record ${value._id} differs from source.`);
        }
      }
      await Promise.all([
        db
          .collection('user')
          .createIndex({ email: 1 }, { name: 'user_email_uidx', unique: true }),
        db
          .collection('session')
          .createIndex(
            { token: 1 },
            { name: 'session_token_uidx', unique: true },
          ),
        db
          .collection('session')
          .createIndex({ userId: 1 }, { name: 'session_userId_idx' }),
        db
          .collection('account')
          .createIndex({ userId: 1 }, { name: 'account_userId_idx' }),
        db
          .collection('account')
          .createIndex(
            { providerId: 1, accountId: 1 },
            { name: 'account_providerId_accountId_uidx', unique: true },
          ),
        db
          .collection('verification')
          .createIndex(
            { identifier: 1 },
            { name: 'verification_identifier_idx' },
          ),
        db.collection('friend').createIndex(
          { pairKey: 1 },
          {
            name: 'friend_active_pair_uidx',
            unique: true,
            partialFilterExpression: {
              status: { $in: ['pending', 'accepted'] },
            },
          },
        ),
        db
          .collection('friend')
          .createIndex(
            { fromId: 1, status: 1, _id: 1 },
            { name: 'friend_from_idx' },
          ),
        db
          .collection('friend')
          .createIndex(
            { toId: 1, status: 1, _id: 1 },
            { name: 'friend_to_idx' },
          ),
      ]);
      console.log('Auth and social import complete.');
    } finally {
      await mongo.close();
    }
  }
} finally {
  await postgres.end();
}

import { createHash } from 'node:crypto';
import { MongoClient, type Document } from 'mongodb';
import { Client } from 'pg';

const columns = {
  user: {
    id: '_id',
    name: 'name',
    email: 'email',
    email_verified: 'emailVerified',
    image: 'image',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  session: {
    id: '_id',
    expires_at: 'expiresAt',
    token: 'token',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    ip_address: 'ipAddress',
    user_agent: 'userAgent',
    user_id: 'userId',
  },
  account: {
    id: '_id',
    account_id: 'accountId',
    provider_id: 'providerId',
    user_id: 'userId',
    access_token: 'accessToken',
    refresh_token: 'refreshToken',
    id_token: 'idToken',
    access_token_expires_at: 'accessTokenExpiresAt',
    refresh_token_expires_at: 'refreshTokenExpiresAt',
    scope: 'scope',
    password: 'password', // betterleaks:allow Database field mapping, not a credential.
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  verification: {
    id: '_id',
    identifier: 'identifier',
    value: 'value',
    expires_at: 'expiresAt',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  jwks: {
    id: '_id',
    public_key: 'publicKey',
    private_key: 'privateKey',
    created_at: 'createdAt',
    expires_at: 'expiresAt',
    alg: 'alg',
    crv: 'crv',
  },
  friend: {
    id: '_id',
    from_id: 'fromId',
    to_id: 'toId',
    status: 'status',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  mail_budget: {
    id: '_id',
    day: 'day',
    day_count: 'dayCount',
    cycle: 'cycle',
    cycle_count: 'cycleCount',
  },
} as const;

type Table = keyof typeof columns;
const tables = Object.keys(columns) as Table[];
const toValue = (value: unknown) =>
  value instanceof Date ? value.toISOString() : (value ?? null);

function convert(table: Table, document: Document) {
  const mapping = columns[table] as Record<string, string>;
  const allowed = new Set([...Object.values(mapping), 'id']);
  if (table === 'friend') allowed.add('pairKey');
  for (const key of Object.keys(document))
    if (!allowed.has(key))
      throw new Error(`${table} has an unsupported field.`);
  if (document.id !== undefined && document.id !== document._id)
    throw new Error(`${table} has a mismatched ID.`);
  if (
    table === 'mail_budget'
      ? document._id !== 1
      : typeof document._id !== 'string'
  )
    throw new Error(`${table} has an invalid ID.`);
  return Object.fromEntries(
    Object.entries(mapping).map(([column, key]) => [
      column,
      toValue(document[key]),
    ]),
  );
}

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--apply'))
  throw new Error('Usage: node server/return-auth-to-postgres.ts [--apply]');
const apply = args.includes('--apply');
const mongoUrl = process.env.RETURN_MONGO_URL;
const postgresUrl = process.env.RETURN_POSTGRES_URL;
if (!mongoUrl) throw new Error('Set RETURN_MONGO_URL.');
const appName = process.env.RETURN_APP_DB ?? 'quizmon_app';
const mongo = await new MongoClient(mongoUrl).connect();
try {
  const db = mongo.db(appName);
  const rows = {} as Record<Table, Record<string, unknown>[]>;
  for (const table of tables) {
    const source = await db.collection(table).find().sort({ _id: 1 }).toArray();
    rows[table] = source.map((document) => convert(table, document));
  }
  const ids = new Set(rows.user.map((row) => row.id));
  if (!ids.size || ids.size !== rows.user.length)
    throw new Error('Auth source has no users or duplicate user IDs.');
  for (const table of ['session', 'account'] as const)
    if (rows[table].some((row) => !ids.has(row.user_id)))
      throw new Error(`${table} refers to a missing user.`);
  if (
    rows.friend.some((row) => !ids.has(row.from_id) || !ids.has(row.to_id)) ||
    rows.mail_budget.length > 1
  )
    throw new Error('Social or mail data does not match the user inventory.');
  const counts = Object.fromEntries(
    tables.map((table) => [table, rows[table].length]),
  );
  const sha256 = createHash('sha256')
    .update(JSON.stringify(rows))
    .digest('hex');
  console.log(
    JSON.stringify({
      source: appName,
      counts,
      sha256,
      applied: apply,
    }),
  );
  if (apply) {
    if (!postgresUrl) throw new Error('Set RETURN_POSTGRES_URL.');
    const tlsServername = process.env.RETURN_POSTGRES_TLS_SERVERNAME;
    const postgres = new Client({
      connectionString: postgresUrl,
      ...(tlsServername
        ? { ssl: { rejectUnauthorized: true, servername: tlsServername } }
        : {}),
    });
    await postgres.connect();
    try {
      await postgres.query('BEGIN');
      try {
        await postgres.query('DELETE FROM friend');
        await postgres.query('DELETE FROM session');
        await postgres.query('DELETE FROM account');
        await postgres.query('DELETE FROM verification');
        await postgres.query('DELETE FROM jwks');
        await postgres.query('DELETE FROM mail_budget');
        await postgres.query('DELETE FROM player');
        await postgres.query('DELETE FROM "user"');
        for (const table of tables) {
          const names = Object.keys(columns[table]);
          const quoted = names.map((name) => `"${name}"`).join(', ');
          const placeholders = names
            .map((_, index) => `$${index + 1}`)
            .join(', ');
          for (const row of rows[table]) {
            await postgres.query(
              `INSERT INTO "${table}" (${quoted}) VALUES (${placeholders})`,
              names.map((name) => row[name]),
            );
          }
        }
        for (const table of tables) {
          const result = await postgres.query<{ count: string }>(
            `SELECT count(*) FROM "${table}"`,
          );
          if (Number(result.rows[0]?.count) !== rows[table].length)
            throw new Error(`${table} count differs after import.`);
        }
        await postgres.query('COMMIT');
        console.log('Auth and social return import complete.');
      } catch (error) {
        await postgres.query('ROLLBACK');
        throw error;
      }
    } finally {
      await postgres.end();
    }
  }
} finally {
  await mongo.close();
}

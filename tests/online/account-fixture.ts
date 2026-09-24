import { createServer } from 'node:net';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createTestHarness } from 'wrangler';
import { localSync } from '../../scripts/dev/local-sync.ts';
import { isRecord } from '../../src/lib/validation.ts';
import { publishPlayerTables } from '../../deploy/publication.ts';

export const docker = (...args: string[]) =>
  execFileSync('docker', args, { encoding: 'utf8', timeout: 30_000 }).trim();
export const migrationsFolder = fileURLToPath(
  new URL('../../server/migrations', import.meta.url),
);

export async function testDatabase() {
  assert.equal(
    docker('context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'),
    'unix:///var/run/docker.sock',
  );
  const container = `quizmon-test-${crypto.randomUUID()}`;
  const image = (
    JSON.parse(
      docker('compose', '-f', 'compose.yaml', 'config', '--format', 'json'),
    ) as { services: { db: { image: string } } }
  ).services.db.image;
  docker(
    'run',
    '--detach',
    '--rm',
    '--pull=never',
    '--name',
    container,
    '--memory=512m',
    '--tmpfs',
    '/var/lib/postgresql:rw,size=256m',
    '--publish',
    '127.0.0.1::5432',
    '--env',
    'POSTGRES_HOST_AUTH_METHOD=trust',
    image,
    '-c',
    'wal_level=logical',
  );
  const port = Number(docker('port', container, '5432/tcp').split(':').at(-1));
  const connectionString = `postgresql://postgres:unused@127.0.0.1:${port}/postgres`;
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 1000 });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await pool.end();
    docker('rm', '--force', container);
  };
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        await pool.query('select 1');
        break;
      } catch (error) {
        if (attempt === 39) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    await migrate(drizzle(pool), { migrationsFolder });
    const client = await pool.connect();
    try {
      await publishPlayerTables(client);
    } finally {
      client.release();
    }
    return { container, connectionString, pool, close };
  } catch (error) {
    await close();
    throw error;
  }
}

export async function startAccountWorker({
  connectionString,
  origin = 'http://localhost:4188',
  secret = crypto.randomUUID() + crypto.randomUUID(),
  sync = localSync,
  prebuiltWorkerDir = process.env.QUIZMON_PREBUILT_WORKER,
}: {
  connectionString: string;
  origin?: string;
  secret?: string;
  sync?: typeof localSync;
  prebuiltWorkerDir?: string;
}) {
  const previous =
    process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_ACCOUNT_DB;
  process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_ACCOUNT_DB =
    connectionString;
  const worker = createTestHarness({
    workers: [
      {
        configPath: new URL('../../deploy/wrangler.jsonc', import.meta.url),
        ...(prebuiltWorkerDir ? { prebuiltWorkerDir } : {}),
        vars: {
          AUTH_ORIGIN: origin,
          MAIL_DELIVERY: 'test-mailbox',
          MAIL_FROM: '',
          POWERSYNC_URL: sync.endpoint,
          POWERSYNC_AUDIENCE: sync.audience,
        },
        secrets: {
          BETTER_AUTH_SECRET: secret,
          VAPID_PRIVATE_KEY: crypto.randomUUID(),
        },
      },
    ],
  });
  try {
    const base = (await worker.listen()).url.origin;
    return { base, origin, close: () => worker.close() };
  } catch (error) {
    await worker.close();
    throw error;
  } finally {
    if (previous === undefined)
      delete process.env
        .CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_ACCOUNT_DB;
    else
      process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_ACCOUNT_DB =
        previous;
  }
}

export async function json(response: Response) {
  const value: unknown = await response.json();
  assert.ok(isRecord(value));
  return value;
}
export function accountRequest(base: string, origin: string) {
  let client = 0;
  return (
    path: string,
    actor?: { cookie: string },
    body?: unknown,
    requestOrigin = origin,
  ) =>
    fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Origin: requestOrigin,
        Cookie: actor?.cookie ?? '',
        'Content-Type': 'application/json',
        // Keep functional scenarios independent of the shared rate-limit window.
        'CF-Connecting-IP': `192.0.${Math.floor(++client / 250)}.${(client % 250) + 1}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
}
export async function signIn(request: ReturnType<typeof accountRequest>) {
  const email = `account-${crypto.randomUUID()}@example.test`;
  assert.equal(
    (
      await request('/api/auth/email-otp/send-verification-otp', undefined, {
        email,
        type: 'sign-in',
      })
    ).status,
    200,
  );
  const mail = await json(
    await request('/api/dev/mailbox?email=' + encodeURIComponent(email)),
  );
  assert.equal(typeof mail.code, 'string');
  const signed = await request('/api/auth/sign-in/email-otp', undefined, {
    email,
    otp: mail.code,
  });
  assert.equal(signed.status, 200);
  const cookie = signed.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  await signed.arrayBuffer();
  const me = await json(await request('/api/me', { cookie }));
  assert.equal(typeof me.id, 'string');
  return { id: me.id as string, cookie };
}

export async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

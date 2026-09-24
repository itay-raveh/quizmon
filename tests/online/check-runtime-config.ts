import {
  accountRequest,
  docker,
  freePort,
  json,
  signIn,
  startAccountWorker,
} from './account-fixture.ts';
import assert from 'node:assert/strict';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { isRecord } from '../../src/lib/validation.ts';
import { readSyncConnection } from '../../src/domain/sync/connection.ts';
import { migrateDatabase } from '../../deploy/migration-runner.ts';
import { publishPlayerTables } from '../../deploy/publication.ts';

const prebuiltWorkerDir = process.env.QUIZMON_PREBUILT_WORKER;
assert.ok(
  prebuiltWorkerDir,
  'Set QUIZMON_PREBUILT_WORKER to a checked combined Worker bundle.',
);
assert.equal(
  docker('context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'),
  'unix:///var/run/docker.sock',
);
const compose = await readFile(
  new URL('../../compose.yaml', import.meta.url),
  'utf8',
);
const postgresImage = /image: (postgres:[^\n]+)/.exec(compose)![1]!;
const syncImage = /image: (journeyapps\/powersync-service[^\n]+)/.exec(
  compose,
)![1]!;
const prefix = `quizmon-runtime-${crypto.randomUUID().slice(0, 8)}`;
const temporaryRoot = fileURLToPath(
  new URL('../../.wrangler/accounts/', import.meta.url),
);
await mkdir(temporaryRoot, { recursive: true });
const directory = await mkdtemp(join(temporaryRoot, 'runtime-'));
await chmod(directory, 0o755);
const containers: string[] = [];
const workers: Awaited<ReturnType<typeof startAccountWorker>>[] = [];
let admin: Client | undefined;
async function object(response: Response) {
  assert.equal(response.status, 200, await response.clone().text());
  return json(response);
}
async function actor(base: string) {
  const { cookie } = await signIn(
    accountRequest(base, 'http://localhost:4188'),
  );
  const bootstrap = await object(
    await fetch(base + '/api/account', { headers: { Cookie: cookie } }),
  );
  const jwt = await object(
    await fetch(base + '/api/auth/token', { headers: { Cookie: cookie } }),
  );
  assert.ok(typeof jwt.token === 'string' && typeof bootstrap.id === 'string');
  const claims: unknown = JSON.parse(
    Buffer.from(jwt.token.split('.')[1]!, 'base64url').toString(),
  );
  assert.ok(isRecord(claims));
  const sync = readSyncConnection(bootstrap.sync);
  assert.equal(claims.aud, sync.audience);
  assert.equal(claims.sub, bootstrap.id);
  assert.equal(Number(claims.exp) - Number(claims.iat), 300);
  return { id: bootstrap.id, token: jwt.token, sync };
}
async function stream(endpoint: string, token: string) {
  return fetch(endpoint + '/sync/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      raw_data: true,
      client_id: crypto.randomUUID(),
      buckets: [],
    }),
    signal: AbortSignal.timeout(45_000),
  });
}
async function ownRows(
  value: Awaited<ReturnType<typeof actor>>,
  excluded: string,
  ownRound: string,
  excludedRound: string,
) {
  let response = await stream(value.sync.endpoint, value.token);
  for (let attempt = 0; response.status === 500 && attempt < 40; attempt++) {
    const error: unknown = await response.clone().json();
    if (
      !isRecord(error) ||
      !isRecord(error.error) ||
      error.error.code !== 'PSYNC_S2302'
    )
      break;
    await response.arrayBuffer();
    await new Promise((resolve) => setTimeout(resolve, 500));
    response = await stream(value.sync.endpoint, value.token);
  }
  assert.equal(
    response.status,
    200,
    response.status === 200 ? '' : await response.text(),
  );
  const reader = response.body!.getReader();
  let text = '';
  try {
    while (!text.includes('checkpoint_complete')) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      text += new TextDecoder().decode(chunk.value);
      assert.ok(text.length < 1_000_000);
    }
  } finally {
    await reader.cancel();
  }
  assert.ok(
    text.includes(value.id),
    'The checkpoint must contain the signed-in account row.',
  );
  assert.ok(
    !text.includes(excluded),
    'The checkpoint must not contain another account.',
  );
  assert.ok(text.includes(ownRound), 'The checkpoint must contain its round.');
  assert.ok(
    !text.includes(excludedRound),
    'The checkpoint must not contain another account round.',
  );
}
try {
  containers.push(prefix + '-db');
  docker(
    'run',
    '--detach',
    '--rm',
    '--pull=never',
    '--name',
    containers[0]!,
    '-e',
    'POSTGRES_HOST_AUTH_METHOD=trust',
    '-p',
    '127.0.0.1::5432',
    postgresImage,
    '-c',
    'wal_level=logical',
  );
  const port = docker('port', containers[0]!, '5432/tcp').split(':').at(-1)!;
  const dbUrl = (name: string) =>
    `postgresql://postgres:unused@127.0.0.1:${port}/${name}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    const probe = new Client({ connectionString: dbUrl('postgres') });
    try {
      await probe.connect();
      admin = probe;
      break;
    } catch {
      await probe.end();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  assert.ok(admin);
  const actors: Awaited<ReturnType<typeof actor>>[] = [];
  for (const name of ['a', 'b']) {
    await admin.query(`CREATE DATABASE source_${name}`);
    await admin.query(`CREATE DATABASE bucket_${name}`);
    await migrateDatabase({
      connectionString: dbUrl(`source_${name}`),
      migrationsFolder: fileURLToPath(
        new URL('../../server/migrations', import.meta.url),
      ),
      configure: publishPlayerTables,
    });
    const syncPort = await freePort();
    const endpoint = `http://127.0.0.1:${syncPort}`;
    const worker = await startAccountWorker({
      connectionString: dbUrl(`source_${name}`),
      prebuiltWorkerDir,
      sync: { endpoint, audience: `quizmon-${name}` },
    });
    workers.push(worker);
    const base = worker.base;
    assert.equal((await fetch(base + '/api/account')).status, 401);
    const owner = await actor(base);
    assert.equal(owner.sync.endpoint, endpoint);
    actors.push(owner);
    const peer = await actor(base);
    const rounds = [crypto.randomUUID(), crypto.randomUUID()];
    const source = new Client({ connectionString: dbUrl(`source_${name}`) });
    await source.connect();
    try {
      for (const [index, player] of [owner, peer].entries())
        await source.query(
          'INSERT INTO round (id, player_id, mode, completed_at, credited, data) VALUES ($1, $2, $3, now(), true, $4)',
          [rounds[index], player.id, 'training', {}],
        );
    } finally {
      await source.end();
    }
    const config = {
      telemetry: { disable_telemetry_sharing: true },
      replication: {
        connections: [
          {
            type: 'postgresql',
            uri: dbUrl(`source_${name}`),
            sslmode: 'disable',
          },
        ],
      },
      storage: {
        type: 'postgresql',
        uri: dbUrl(`bucket_${name}`),
        sslmode: 'disable',
      },
      port: syncPort,
      sync_config: { path: '/config/sync-config.yaml' },
      client_auth: {
        jwks_uri: base + '/api/auth/jwks',
        audience: [`quizmon-${name}`],
        allow_local_jwks: true,
      },
    };
    const configFile = join(directory, `${name}.json`);
    await writeFile(configFile, JSON.stringify(config));
    await writeFile(
      join(directory, 'sync-config.yaml'),
      await readFile(
        new URL('../../deploy/powersync/sync-config.yaml', import.meta.url),
      ),
    );
    const container = prefix + '-sync-' + name;
    containers.push(container);
    docker(
      'run',
      '--detach',
      '--pull=never',
      '--read-only',
      '--user',
      '901:901',
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges',
      '--tmpfs',
      '/tmp',
      '--memory',
      '768m',
      '--name',
      container,
      '--network',
      'host',
      '-e',
      `POWERSYNC_CONFIG_PATH=/config/${name}.json`,
      '-e',
      'NODE_OPTIONS=--max-old-space-size=512',
      '-v',
      `${directory}:/config:ro`,
      syncImage,
      'start',
      '-r',
      'unified',
    );
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const health = await fetch(endpoint + '/probes/startup', {
          signal: AbortSignal.timeout(1000),
        });
        await health.arrayBuffer();
        if (health.ok) {
          ready = true;
          break;
        }
      } catch {
        /* The container may not have bound its port yet. */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, 'PowerSync must become ready.');
    const readiness = await fetch(endpoint + '/probes/readiness', {
      signal: AbortSignal.timeout(1000),
    });
    await readiness.arrayBuffer();
    assert.equal(readiness.status, 200);
    await ownRows(owner, peer.id, rounds[0]!, rounds[1]!);
    await ownRows(peer, owner.id, rounds[1]!, rounds[0]!);
    console.log(
      `Runtime environment ${name}: configured endpoint, five-minute token, and isolated replicated player and round rows passed.`,
    );
  }
  for (const [source, destination] of [
    [0, 1],
    [1, 0],
  ] as const) {
    const response = await stream(
      actors[destination]!.sync.endpoint,
      actors[source]!.token,
    );
    assert.equal(response.status, 401);
    await response.arrayBuffer();
  }
  console.log(
    'RUNTIME CONFIG CHECKS PASSED: the same prebuilt Worker serves both environments; cross-environment tokens are rejected by real PowerSync.',
  );
} catch (error) {
  for (const container of containers.filter((name) =>
    name.includes('-sync-'),
  )) {
    try {
      console.error(docker('logs', '--tail', '15', container));
    } catch {
      /* Cleanup also handles failed starts. */
    }
  }
  throw error;
} finally {
  for (const worker of workers) await worker.close();
  await admin?.end();
  for (const container of containers.toReversed()) {
    try {
      docker('rm', '--force', container);
    } catch {
      /* A failed start may already have removed the container. */
    }
  }
  await rm(directory, { recursive: true, force: true });
}

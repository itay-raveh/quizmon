import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { Client } from 'pg';
import { isRecord } from '../../src/lib/validation.ts';
import { setTimeout as delay } from 'node:timers/promises';
import {
  cloudflareRelease,
  deployedVersion,
  releaseMessage,
} from '../../deploy/cloudflare-release.ts';
import {
  coordinateRelease,
  ActivationNotStartedError,
  PendingActivationError,
} from '../../deploy/release-coordinator.ts';
import { runReleaseProcess } from '../../deploy/release-process.ts';

const operation = {
  version: 1 as const,
  id: crypto.randomUUID(),
  artifact: 'sha256:' + 'a'.repeat(64),
  configuration: 'sha256:' + 'b'.repeat(64),
};
const versionId = crypto.randomUUID();
const deploymentId = crypto.randomUUID();
const token = 'private-test-token';
const output = JSON.stringify({
  type: 'deploy',
  version: 1,
  worker_name: 'quizmon-test',
  version_id: versionId,
  worker_name_overridden: false,
});
const deployment = {
  id: deploymentId,
  strategy: 'percentage',
  versions: [{ version_id: versionId, percentage: 100 }],
};
const detail = {
  id: versionId,
  annotations: { 'workers/message': releaseMessage(operation) },
};
const connection = {
  accountId: 'a'.repeat(32),
  token,
  workerName: 'quizmon-test',
  operation,
  requestTimeoutMs: 1000,
};
const response = (result: unknown) =>
  Promise.resolve(Response.json({ success: true, result }));
const temporaryRoot = resolve('.wrangler/accounts');
await mkdir(temporaryRoot, { recursive: true });

await test('structured Wrangler output requires one completed deployment for the expected Worker', () => {
  assert.equal(
    deployedVersion(
      JSON.stringify({ type: 'wrangler-session', version: 1 }) +
        '\n' +
        output +
        '\n',
      'quizmon-test',
    ),
    versionId,
  );
  for (const invalid of [
    '',
    'not json',
    output + '\n' + output,
    output.replace('quizmon-test', 'other'),
    output.replace(versionId, 'not-a-uuid'),
    output.replace('"version":1', '"version":2'),
    output.replace('false', 'true'),
    JSON.stringify({ ...JSON.parse(output), wrangler_environment: 'other' }),
    'x'.repeat(1024 * 1024 + 1),
  ])
    assert.throws(
      () => deployedVersion(invalid, 'quizmon-test'),
      PendingActivationError,
    );
});

await test('verification checks the active deployment, exact version and operation annotation using read-only requests', async () => {
  const paths: string[] = [];
  const api = cloudflareRelease({
    ...connection,
    fetch: (url, init) => {
      paths.push(url);
      assert.equal(init?.redirect, 'error');
      assert.equal(init?.method, undefined);
      assert.equal(
        new Headers(init?.headers).get('Authorization'),
        'Bearer ' + token,
      );
      return response(
        url.endsWith('/deployments') ? { deployments: [deployment] } : detail,
      );
    },
  });
  const receipt = await api.inspect(versionId);
  assert.deepEqual(receipt, { versionId, deploymentId });
  await api.verify(receipt);
  assert.equal(paths.length, 4);
  assert.ok(
    paths.every((path) =>
      path.startsWith(
        'https://api.cloudflare.com/client/v4/accounts/' +
          connection.accountId +
          '/workers/scripts/quizmon-test/',
      ),
    ),
  );
  await assert.rejects(
    api.verify({ ...receipt, deploymentId: crypto.randomUUID() }),
    PendingActivationError,
  );
});

await test('inactive historical versions, split traffic, malformed responses and wrong operation remain unresolved', async () => {
  for (const [latest, version] of [
    [undefined, detail],
    [
      {
        ...deployment,
        versions: [{ version_id: crypto.randomUUID(), percentage: 100 }],
      },
      detail,
    ],
    [
      {
        ...deployment,
        versions: [
          { version_id: versionId, percentage: 50 },
          { version_id: crypto.randomUUID(), percentage: 50 },
        ],
      },
      detail,
    ],
    [{ ...deployment, id: 'bad' }, detail],
    [
      deployment,
      {
        ...detail,
        annotations: {
          'workers/message': releaseMessage({
            ...operation,
            id: crypto.randomUUID(),
          }),
        },
      },
    ],
    [deployment, { ...detail, id: crypto.randomUUID() }],
  ]) {
    const api = cloudflareRelease({
      ...connection,
      fetch: (url) =>
        response(
          url.endsWith('/deployments')
            ? { deployments: [latest, deployment] }
            : version,
        ),
    });
    await assert.rejects(api.inspect(versionId), PendingActivationError);
    await assert.rejects(api.inspect(), PendingActivationError);
  }
});

await test('remote errors, excessive bodies and transport errors do not disclose credentials or remote response text', async () => {
  for (const fetcher of [
    () => Promise.resolve(new Response(token, { status: 403 })),
    () => Promise.resolve(Response.json({ success: false, errors: [token] })),
    () => Promise.resolve(new Response(token.repeat(100_000))),
    () => Promise.reject(new Error(token)),
  ]) {
    const api = cloudflareRelease({ ...connection, fetch: fetcher });
    await assert.rejects(
      api.inspect(versionId),
      (error: unknown) =>
        error instanceof PendingActivationError &&
        !String(error).includes(token),
    );
  }
});

await test('activation runs one isolated process, checks selection, and verifies the resulting receipt', async () => {
  const directory = await mkdtemp(join(temporaryRoot, 'cloudflare-test-'));
  try {
    const cli = join(directory, 'node_modules/wrangler/wrangler-dist');
    await mkdir(cli, { recursive: true });
    await writeFile(
      join(directory, 'wrangler.json'),
      JSON.stringify({ name: 'quizmon-test', no_bundle: true }),
    );
    const marker = join(directory, 'called.json');
    await writeFile(
      join(cli, 'cli.js'),
      `const fs = require('node:fs'); fs.writeFileSync(${JSON.stringify(marker)}, JSON.stringify({args:process.argv.slice(2),token:process.env.CLOUDFLARE_API_TOKEN,override:process.env.CLOUDFLARE_API_BASE_URL})); fs.writeFileSync(process.env.WRANGLER_OUTPUT_FILE_PATH, ${JSON.stringify(output)});`,
    );
    let selected = 0;
    const api = cloudflareRelease({
      ...connection,
      fetch: (url) =>
        response(
          url.endsWith('/deployments') ? { deployments: [deployment] } : detail,
        ),
    });
    const input = {
      artifactRoot: directory,
      preparedDirectory: directory,
      secretsFile: join(directory, 'secrets.json'),
      temporaryRoot: directory,
      timeoutMs: 2000,
      signal: new AbortController().signal,
      assertSelected: () => {
        selected++;
        return Promise.resolve();
      },
    };
    assert.deepEqual(await api.activate(input), { deploymentId, versionId });
    assert.equal(selected, 1);
    const called: unknown = JSON.parse(await readFile(marker, 'utf8'));
    assert.ok(isRecord(called));
    assert.equal(called.token, token);
    assert.equal(called.override, undefined);
    assert.deepEqual(called.args, [
      'deploy',
      '--config',
      join(directory, 'wrangler.json'),
      '--secrets-file',
      input.secretsFile,
      '--message',
      releaseMessage(operation),
    ]);
    await rm(marker);
    await assert.rejects(
      api.activate({
        ...input,
        assertSelected: () => Promise.reject(new Error('Obsolete selection')),
      }),
      ActivationNotStartedError,
    );
    await assert.rejects(readFile(marker));
    await writeFile(join(cli, 'cli.js'), 'process.exit(1)');
    await assert.rejects(api.activate(input), PendingActivationError);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

await test('pre-cancelled activation starts no process; timeout and cancellation retain uncertainty', async () => {
  const directory = await mkdtemp(join(temporaryRoot, 'process-test-'));
  try {
    const controller = new AbortController();
    controller.abort();
    const base = {
      command: process.execPath,
      args: ['-e', 'setInterval(()=>{},1000)'],
      cwd: directory,
      env: {},
      timeoutMs: 1000,
    };
    await assert.rejects(
      runReleaseProcess({ ...base, signal: controller.signal }),
      ActivationNotStartedError,
    );
    await assert.rejects(
      runReleaseProcess({
        ...base,
        timeoutMs: 25,
        signal: new AbortController().signal,
      }),
      PendingActivationError,
    );
    const cancellation = new AbortController();
    const marker = join(directory, 'pid');
    const pending = runReleaseProcess({
      ...base,
      args: [
        '-e',
        `require('node:fs').writeFileSync(${JSON.stringify(marker)},String(process.pid));setInterval(()=>{},1000)`,
      ],
      signal: cancellation.signal,
    });
    const rejected = assert.rejects(pending, PendingActivationError);
    let pid = 0;
    for (let i = 0; i < 100 && !pid; i++) {
      try {
        pid = Number(await readFile(marker, 'utf8'));
      } catch {
        await delay(10);
      }
    }
    cancellation.abort();
    await rejected;
    assert.ok(pid > 0);
    assert.throws(() => process.kill(pid, 0));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

await test('the pinned real Wrangler CLI can run through the process adapter without its launcher', async () => {
  await runReleaseProcess({
    command: process.execPath,
    args: [resolve('node_modules/wrangler/wrangler-dist/cli.js'), '--help'],
    cwd: resolve('.'),
    env: { PATH: process.env.PATH, WRANGLER_SEND_METRICS: 'false' },
    signal: new AbortController().signal,
    timeoutMs: 30_000,
  });
});

await test('cancellation stops descendants in the release process group', async () => {
  const directory = await mkdtemp(join(temporaryRoot, 'process-group-test-'));
  const controller = new AbortController();
  try {
    const heartbeat = join(directory, 'heartbeat');
    const descendant = `setInterval(()=>require('node:fs').appendFileSync(${JSON.stringify(heartbeat)},'x'),10)`;
    const parent = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});setInterval(()=>{},1000)`;
    const pending = runReleaseProcess({
      command: process.execPath,
      args: ['-e', parent],
      cwd: directory,
      env: {},
      timeoutMs: 3000,
      signal: controller.signal,
    });
    const rejected = assert.rejects(pending, PendingActivationError);
    let started = false;
    for (let i = 0; i < 100 && !started; i++) {
      try {
        started = (await readFile(heartbeat)).length > 0;
      } catch {
        await delay(10);
      }
    }
    controller.abort();
    await rejected;
    assert.ok(started);
    const stopped = await readFile(heartbeat, 'utf8');
    await delay(100);
    assert.equal(await readFile(heartbeat, 'utf8'), stopped);
  } finally {
    controller.abort();
    await rm(directory, { recursive: true, force: true });
  }
});

await test('real PostgreSQL journal recovers confirmed activations after a lost process or API response without redeploying', async () => {
  const admin = new Client({
    connectionString: 'postgresql://postgres:unused@127.0.0.1:5548/postgres',
  });
  await admin.connect();
  try {
    for (const mode of [
      'success',
      'lost-process-response',
      'lost-api-response',
    ]) {
      const database = 'quizmon_cf_' + crypto.randomUUID().replaceAll('-', '');
      await admin.query('CREATE DATABASE ' + database);
      const directory = await mkdtemp(join(temporaryRoot, 'coordinator-cf-'));
      const databaseConnection = {
        connectionString: `postgresql://postgres:unused@127.0.0.1:5548/${database}`,
      };
      const client = new Client(databaseConnection);
      try {
        await client.connect();
        const cli = join(directory, 'node_modules/wrangler/wrangler-dist');
        await mkdir(cli, { recursive: true });
        await writeFile(
          join(directory, 'wrangler.json'),
          JSON.stringify({ name: 'quizmon-test', no_bundle: true }),
        );
        const marker = join(directory, 'activations');
        await writeFile(
          join(cli, 'cli.js'),
          `const fs=require('node:fs');fs.appendFileSync(${JSON.stringify(marker)}, ${JSON.stringify('activated\n')});fs.writeFileSync(process.env.WRANGLER_OUTPUT_FILE_PATH, ${JSON.stringify(output)});process.exit(${mode === 'lost-process-response' ? 1 : 0});`,
        );
        let apiUnavailable = mode === 'lost-api-response';
        const api = cloudflareRelease({
          ...connection,
          fetch: (url) =>
            apiUnavailable
              ? Promise.reject(new Error('Lost response'))
              : response(
                  url.endsWith('/deployments')
                    ? { deployments: [deployment] }
                    : detail,
                ),
        });
        const options = {
          connection: databaseConnection,
          operation,
          migrationsFolder: resolve('server/migrations'),
          preflight: () => Promise.resolve(),
          assertSelected: () => Promise.resolve(),
          configure: () => Promise.resolve(),
          activate: (_operation: unknown, signal: AbortSignal) =>
            api.activate({
              artifactRoot: directory,
              preparedDirectory: directory,
              secretsFile: join(directory, 'secrets.json'),
              temporaryRoot: directory,
              timeoutMs: 2000,
              signal,
              assertSelected: () => Promise.resolve(),
            }),
          inspectActivation: (signal: AbortSignal) =>
            api.inspect(undefined, signal),
          verifyDeployment: (receipt: {
            versionId: string;
            deploymentId: string;
          }) => api.verify(receipt),
        };
        if (mode === 'success') {
          assert.equal((await coordinateRelease(options)).status, 'activated');
          assert.equal(
            (await coordinateRelease(options)).status,
            'verified-existing',
          );
        } else {
          await assert.rejects(
            coordinateRelease(options),
            PendingActivationError,
          );
          if (apiUnavailable)
            await assert.rejects(
              coordinateRelease(options),
              PendingActivationError,
            );
          apiUnavailable = false;
          assert.equal(
            (await coordinateRelease(options)).status,
            'verified-existing',
          );
        }
        assert.equal(await readFile(marker, 'utf8'), 'activated\n');
        const journal = await client.query<{ phase: string }>(
          'SELECT phase FROM quizmon_release.operations',
        );
        assert.deepEqual(journal.rows, [{ phase: 'active' }]);
      } finally {
        await client.end();
        await admin.query('DROP DATABASE ' + database + ' WITH (FORCE)');
        await rm(directory, { recursive: true, force: true });
      }
    }
  } finally {
    await admin.end();
  }
});

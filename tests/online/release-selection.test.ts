import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { releaseSelection } from '../../deploy/release-selection.ts';

await test('selection reads the named ConfigMap with TLS, observes token rotation, and rejects obsolete or unverifiable releases', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'quizmon-selection-'));
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      'server.key',
      '-out',
      'ca.crt',
      '-days',
      '1',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost',
    ],
    { cwd: directory, stdio: 'pipe' },
  );
  const operation = {
    version: 1 as const,
    id: crypto.randomUUID(),
    artifact: 'sha256:' + '1'.repeat(64),
    configuration: 'sha256:' + '2'.repeat(64),
  };
  let status = 200;
  let body = JSON.stringify({
    data: { 'operation.json': JSON.stringify(operation) },
  });
  const requests: Array<{
    url: string | undefined;
    authorization: string | undefined;
  }> = [];
  const server = createServer(
    {
      key: await readFile(join(directory, 'server.key')),
      cert: await readFile(join(directory, 'ca.crt')),
    },
    (req, res) => {
      requests.push({ url: req.url, authorization: req.headers.authorization });
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(body);
    },
  );
  try {
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const options = {
      endpoint: `https://localhost:${address.port}`,
      namespace: 'quizmon-test',
      configMap: 'quizmon-selection',
      credentialsDirectory: directory,
    };
    const selected = releaseSelection(options);
    await writeFile(join(directory, 'token'), 'first-token');
    await selected(operation);
    await writeFile(join(directory, 'token'), 'rotated-token');
    await selected(operation);
    assert.deepEqual(requests, [
      {
        url: '/api/v1/namespaces/quizmon-test/configmaps/quizmon-selection',
        authorization: 'Bearer first-token',
      },
      {
        url: '/api/v1/namespaces/quizmon-test/configmaps/quizmon-selection',
        authorization: 'Bearer rotated-token',
      },
    ]);
    await assert.rejects(
      selected({ ...operation, id: crypto.randomUUID() }),
      /could not be verified/,
    );
    await assert.rejects(
      selected({ ...operation, configuration: 'sha256:' + '3'.repeat(64) }),
    );
    for (const code of [403, 404, 500, 302]) {
      status = code;
      await assert.rejects(selected(operation), /could not be verified/);
    }
    status = 200;
    for (const value of [
      'not-json',
      '{}',
      JSON.stringify({ data: { 'operation.json': '{}' } }),
      'x'.repeat(65537),
    ]) {
      body = value;
      await assert.rejects(selected(operation), /could not be verified/);
    }
    await assert.rejects(
      releaseSelection({
        ...options,
        endpoint: `https://127.0.0.1:${address.port}`,
      })(operation),
      /could not be verified/,
    );
    assert.throws(() =>
      releaseSelection({ ...options, endpoint: 'http://localhost' }),
    );
    assert.throws(() =>
      releaseSelection({ ...options, configMap: '../secrets' }),
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(directory, { recursive: true, force: true });
  }
});

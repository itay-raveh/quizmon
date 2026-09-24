import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAccountApi } from '../../server/api.ts';
import { accountRuntime } from '../../server/account-config.ts';

const valid = {
  origin: 'https://game.example.test',
  secret: 'x'.repeat(32),
  sync: {
    version: 1 as const,
    endpoint: 'https://sync.example.test',
    audience: 'quizmon',
  },
  mail: { mode: 'cloudflare' },
};
await test('public API is restricted to its configured canonical origin', () => {
  const runtime = accountRuntime(valid);
  assert.ok(runtime.accepts('https://game.example.test/api/account'));
  for (const url of [
    'http://game.example.test/api/account',
    'https://other.example.test/api/account',
    'http://localhost:8787/api/account',
  ])
    assert.equal(runtime.accepts(url), false);
});
await test('public accounts reject test mail, local sync, weak secrets, and unsafe origins', () => {
  for (const value of [
    { ...valid, mail: { mode: 'test-mailbox' } },
    { ...valid, mail: { mode: 'unknown' } },
    { ...valid, secret: '' },
    { ...valid, origin: 'http://game.example.test' },
    { ...valid, origin: 'https://game.example.test/path' },
    { ...valid, sync: { ...valid.sync, endpoint: 'http://localhost:8089' } },
    { ...valid, sync: { ...valid.sync, endpoint: 'https://localhost:8089' } },
  ])
    assert.throws(() => accountRuntime(value));
});
await test('explicit local fixtures remain local with the test mailbox', () => {
  const runtime = accountRuntime({
    ...valid,
    origin: 'http://localhost:4188',
    mail: { mode: 'test-mailbox' },
    sync: { ...valid.sync, endpoint: 'http://127.0.0.1:8089' },
  });
  assert.ok(runtime.accepts('http://127.0.0.1:4199/api/account'));
  assert.equal(runtime.accepts(valid.origin + '/api/account'), false);
});

await test('public accounts reject inaccessible routes and oversized writes', async () => {
  const api = createAccountApi({
    ...valid,
    connectionString: 'postgresql://unavailable.invalid/test',
    mail: {
      mode: 'cloudflare',
      deliver: () => {
        throw new Error('Delivery must not run.');
      },
    },
  });
  for (const path of ['/api/completions', '/api/dev/mailbox']) {
    const response = await api.request(
      new Request(valid.origin + path, { method: 'POST' }),
    );
    assert.equal(response.status, 404);
  }
  const wrongOrigin = await api.request(
    'https://other.example.test/api/account',
  );
  assert.equal(wrongOrigin.status, 403);
  const oversized = await api.request(valid.origin + '/api/account/link', {
    method: 'POST',
    body: 'x'.repeat(1024 * 1024 + 1),
  });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.headers.get('Cache-Control'), 'no-store');
});

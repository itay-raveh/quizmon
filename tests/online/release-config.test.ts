import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readWorkerTemplate } from '../../deploy/worker-template.ts';
import {
  readReleaseConfig,
  renderSourceWorkerConfig,
} from '../../deploy/release-config.ts';

const config = {
  version: 1,
  workerName: 'quizmon-release-check',
  origin: 'https://game.example.test',
  sync: {
    version: 1,
    endpoint: 'https://sync.example.test/',
    audience: 'quizmon-release-check',
  },
  hyperdriveId: '1'.repeat(32),
  mailFrom: 'signin@example.test',
  authRateLimitNamespace: '2011',
  apiRateLimitNamespace: '2012',
};

await test('runtime renderer preserves game bindings and limits without local database or mailbox defaults', () => {
  const rawConfig = readWorkerTemplate(
    new URL('../../deploy/wrangler.jsonc', import.meta.url).pathname,
  );
  const input = readReleaseConfig(config);
  const rendered = renderSourceWorkerConfig(rawConfig, input);
  assert.equal(input.sync.endpoint, 'https://sync.example.test');
  for (const field of [
    'limits',
    'durable_objects',
    'exports',
    'secrets',
    'send_email',
  ])
    assert.deepEqual(
      rendered[field as keyof typeof rendered],
      rawConfig[field],
    );
  assert.deepEqual(rendered.hyperdrive, [
    { binding: 'ACCOUNT_DB', id: config.hyperdriveId },
  ]);
  assert.equal(rendered.vars.MAIL_DELIVERY, 'cloudflare');
  assert.equal(rendered.vars.AUTH_ORIGIN, config.origin);
  assert.equal(rendered.vars.POWERSYNC_AUDIENCE, input.sync.audience);
  assert.equal(rendered.main, './worker/index.ts');
  assert.equal(rendered.assets.directory, './dist');
  assert.equal(rendered.no_bundle, false);
  assert.ok(!JSON.stringify(rendered).includes('127.0.0.1'));
  assert.ok(!JSON.stringify(rendered).includes('test-mailbox'));
});

await test('unsupported, incomplete, or local production inputs are rejected before preparing output', () => {
  for (const invalid of [
    { ...config, version: 2 },
    { ...config, origin: '' },
    { ...config, mailFrom: '' },
    { ...config, origin: 'https://game.example.test/path' },
    { ...config, origin: 'http://game.example.test' },
    { ...config, origin: 'https://127.0.0.1' },
    { ...config, origin: 'https://localhost' },
    {
      ...config,
      origin: `https://user:${crypto.randomUUID()}@game.example.test`,
    },
    { ...config, hyperdriveId: '0'.repeat(32) },
    { ...config, apiRateLimitNamespace: config.authRateLimitNamespace },
    { ...config, sync: { ...config.sync, endpoint: 'http://127.0.0.1:8089' } },
    { ...config, sync: { ...config.sync, audience: '' } },
  ])
    assert.throws(() => readReleaseConfig(invalid));
});

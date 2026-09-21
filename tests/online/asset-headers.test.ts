import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accountAssetHeaders } from '../../deploy/asset-headers.ts';

const template =
  "/*\n  Content-Security-Policy: default-src 'self'; connect-src 'self'; script-src 'self'; upgrade-insecure-requests\n  X-Frame-Options: DENY\n";
const sync = {
  version: 1,
  endpoint: 'https://sync.example.test/path/',
  audience: 'quizmon',
};

await test('adds only the selected HTTP and WebSocket origins and preserves other headers', () => {
  const headers = accountAssetHeaders(template, sync);
  assert.equal(
    headers,
    template.replace(
      "connect-src 'self'",
      "connect-src 'self' https://sync.example.test wss://sync.example.test",
    ),
  );
  assert.equal(accountAssetHeaders(headers, sync), headers);
});

await test('missing or multiple policies and unsafe endpoints fail closed', () => {
  for (const value of ['', template + template])
    assert.throws(
      () => accountAssetHeaders(value, sync),
      /one game connect-src/,
    );
  assert.throws(
    () =>
      accountAssetHeaders(template, {
        ...sync,
        endpoint: 'http://public.example.test',
      }),
    /unsafe/,
  );
});

await test('allows only the configured Sentry ingest origin', () => {
  const headers = accountAssetHeaders(
    template,
    sync,
    'https://public-key@o123.ingest.sentry.io/456',
  );
  assert.match(
    headers,
    /connect-src [^;]+ https:\/\/o123\.ingest\.sentry\.io;/,
  );
  assert.doesNotMatch(headers, /public-key/);
  assert.throws(
    () => accountAssetHeaders(template, sync, 'http://key@example.com/1'),
    /HTTPS/,
  );
});

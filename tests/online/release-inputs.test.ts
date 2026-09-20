import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import { test } from 'node:test';
import {
  readMigrationConnection,
  readWorkerSecrets,
} from '../../deploy/release-inputs.ts';

await test('release secrets reject missing, malformed, and mismatched reminder keys without echoing them', () => {
  const curve = createECDH('prime256v1');
  const publicKey = curve.generateKeys().toString('base64url');
  const secrets = {
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    VAPID_PRIVATE_KEY: curve.getPrivateKey().toString('base64url'),
  };
  assert.deepEqual(readWorkerSecrets(secrets, publicKey), secrets);
  for (const invalid of [
    null,
    {},
    { ...secrets, BETTER_AUTH_SECRET: ' '.repeat(64) },
    { ...secrets, VAPID_PRIVATE_KEY: 'private-secret-marker' },
    { ...secrets, VAPID_PRIVATE_KEY: randomBytes(32).toString('base64url') },
    { ...secrets, VAPID_PRIVATE_KEY: Buffer.alloc(32).toString('base64url') },
  ]) {
    assert.throws(
      () => readWorkerSecrets(invalid, publicKey),
      (error: Error) => {
        assert.ok(!error.message.includes('private-secret-marker'));
        assert.ok(!error.message.includes(secrets.BETTER_AUTH_SECRET));
        assert.ok(!error.message.includes(secrets.VAPID_PRIVATE_KEY));
        return true;
      },
    );
  }
});

await test('migration inputs enforce verified TLS without URI or environment overrides', () => {
  const input = {
    version: 1,
    host: 'db.example.test',
    port: 5432,
    database: 'quizmon',
    user: 'migrator',
    password: randomBytes(32).toString('hex'),
  };
  const connection = readMigrationConnection(input);
  assert.deepEqual(connection.ssl, { rejectUnauthorized: true });
  assert.equal(connection.connectionString, undefined);
  assert.equal(connection.host, input.host);
  assert.equal(connection.password, input.password);
  for (const invalid of [
    { ...input, version: 2 },
    { ...input, password: '' },
    { ...input, host: '127.0.0.1' },
    { ...input, host: '/var/run/postgresql' },
    { ...input, host: 'db.local' },
    { ...input, host: 'db..example.test' },
    { ...input, port: 0 },
    { ...input, port: 65536 },
    { ...input, ssl: false },
    { ...input, connectionString: 'postgresql://secret-marker' },
  ])
    assert.throws(() => readMigrationConnection(invalid));
});

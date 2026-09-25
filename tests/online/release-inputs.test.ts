import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { readMigrationConnection } from '../../deploy/release-inputs.ts';

await test('migration inputs enforce verified TLS without URI or environment overrides', () => {
  const input = {
    host: 'db.example.test',
    port: 5432,
    database: 'quizmon',
    user: 'migrator',
    password: randomBytes(32).toString('hex'),
  };
  const connection = readMigrationConnection(input);
  assert.deepEqual(
    readMigrationConnection({ ...input, version: 1 }),
    connection,
  );
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

import { createECDH } from 'node:crypto';
import { isIP } from 'node:net';
import type { ClientConfig } from 'pg';
import { isRecord } from '../src/lib/validation.ts';

export function readWorkerSecrets(value: unknown, publicKey: string) {
  if (!isRecord(value)) throw new Error('Worker secrets must be an object.');
  if (
    typeof value.BETTER_AUTH_SECRET !== 'string' ||
    value.BETTER_AUTH_SECRET.trim().length < 32
  )
    throw new Error('BETTER_AUTH_SECRET requires at least 32 characters.');
  if (
    typeof value.VAPID_PRIVATE_KEY !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(value.VAPID_PRIVATE_KEY)
  )
    throw new Error('VAPID_PRIVATE_KEY must encode a 32-byte private key.');
  try {
    const key = Buffer.from(value.VAPID_PRIVATE_KEY, 'base64url');
    if (key.toString('base64url') !== value.VAPID_PRIVATE_KEY)
      throw new Error();
    const curve = createECDH('prime256v1');
    curve.setPrivateKey(key);
    if (curve.getPublicKey().toString('base64url') !== publicKey)
      throw new Error();
  } catch {
    throw new Error(
      'VAPID_PRIVATE_KEY does not match the shipped reminder key.',
    );
  }
  return {
    BETTER_AUTH_SECRET: value.BETTER_AUTH_SECRET,
    VAPID_PRIVATE_KEY: value.VAPID_PRIVATE_KEY,
  };
}

export function readMigrationConnection(value: unknown): ClientConfig {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    Object.keys(value).some(
      (key) =>
        !['version', 'host', 'port', 'database', 'user', 'password'].includes(
          key,
        ),
    )
  )
    throw new Error('Unsupported migration connection configuration.');
  for (const key of ['host', 'database', 'user', 'password'])
    if (typeof value[key] !== 'string' || !value[key])
      throw new Error(`Missing migration connection field: ${key}.`);
  const { host, database, user, password } = value as Record<string, string>;
  if (
    !host ||
    isIP(host) ||
    !host.includes('.') ||
    host.length > 253 ||
    host
      .split('.')
      .some(
        (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
      ) ||
    /\.(localhost|local|invalid)$/i.test(host)
  )
    throw new Error('The migration host must be a certificate DNS name.');
  if (
    !Number.isInteger(value.port) ||
    (value.port as number) < 1 ||
    (value.port as number) > 65535
  )
    throw new Error('The migration database port is invalid.');
  return {
    host,
    port: value.port as number,
    database,
    user,
    password,
    // URI SSL options replace pg's explicit TLS settings. Accept structured fields only.
    // https://node-postgres.com/features/ssl
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
    application_name: 'quizmon-release-preflight',
  };
}

export function readCloudflareConnection(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.accountId !== 'string' ||
    !/^[a-f0-9]{32}$/i.test(value.accountId) ||
    typeof value.token !== 'string' ||
    !value.token ||
    /\s/.test(value.token)
  )
    throw new Error('Invalid Cloudflare deployment credentials.');
  return { accountId: value.accountId, token: value.token };
}

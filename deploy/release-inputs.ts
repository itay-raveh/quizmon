import { isIP } from 'node:net';
import type { ClientConfig } from 'pg';
import { isRecord } from '../src/lib/validation.ts';

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
    application_name: 'quizmon-migration',
  };
}

import { isIP } from 'node:net';
import type { ClientConfig } from 'pg';
import { z } from 'zod';

const connectionSchema = z.strictObject({
  host: z
    .hostname()
    .max(253)
    .refine(
      (host) =>
        !isIP(host) &&
        host.includes('.') &&
        !host.endsWith('.') &&
        !/\.(localhost|local|invalid)$/i.test(host),
    ),
  port: z.int().min(1).max(65535),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
});

export function readMigrationConnection(value: unknown): ClientConfig {
  const { host, port, database, user, password } =
    connectionSchema.parse(value);
  return {
    host,
    port,
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

import { isIP } from 'node:net';
import { z } from 'zod';
import { isRecord } from '../src/lib/validation.ts';
import {
  readSyncConnection,
  type SyncConnection,
} from '../src/domain/sync/connection.ts';

export const releaseConfigSchema = z.object({
  version: z.literal(1),
  workerName: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
  origin: z.string().min(1),
  sync: z.object({
    version: z.literal(1),
    endpoint: z.string().min(1),
    audience: z.string().min(1),
  }),
  hyperdriveId: z
    .string()
    .min(1)
    .regex(/^[a-fA-F0-9]{32}$/),
  mailFrom: z
    .string()
    .min(1)
    .regex(/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/),
  authRateLimitNamespace: z
    .string()
    .min(1)
    .regex(/^[1-9]\d*$/),
  apiRateLimitNamespace: z
    .string()
    .min(1)
    .regex(/^[1-9]\d*$/),
});

export type ReleaseConfig = z.infer<typeof releaseConfigSchema> & {
  sync: SyncConnection;
};

function publicUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    isIP(url.hostname.replace(/^\[|\]$/g, '')) ||
    !url.hostname.includes('.') ||
    url.hostname.endsWith('.localhost') ||
    url.hostname.endsWith('.local')
  )
    throw new Error(
      'Release endpoints must use HTTPS DNS names without credentials, queries, or fragments.',
    );
  return url;
}

export function readReleaseConfig(value: unknown): ReleaseConfig {
  if (!isRecord(value) || value.version !== 1)
    throw new Error('Unsupported release configuration.');
  const parsed = releaseConfigSchema.safeParse(value);
  const missing = parsed.success
    ? undefined
    : parsed.error.issues.find(
        (issue) =>
          issue.path.length === 1 &&
          [
            'workerName',
            'origin',
            'hyperdriveId',
            'mailFrom',
            'authRateLimitNamespace',
            'apiRateLimitNamespace',
          ].includes(String(issue.path[0])) &&
          (issue.code === 'invalid_type' || issue.code === 'too_small'),
      );
  if (missing)
    throw new Error(
      `Missing release configuration: ${String(missing.path[0])}.`,
    );
  const origin = publicUrl(value.origin as string);
  const sync = readSyncConnection(value.sync);
  publicUrl(sync.endpoint);
  if (origin.pathname !== '/')
    throw new Error('The application origin cannot contain a path.');
  const invalid = new Set(
    parsed.success ? [] : parsed.error.issues.map((issue) => issue.path[0]),
  );
  if (invalid.has('workerName')) throw new Error('Invalid Worker name.');
  if (
    invalid.has('hyperdriveId') ||
    (typeof value.hyperdriveId === 'string' && /^0+$/.test(value.hyperdriveId))
  )
    throw new Error('A provisioned Hyperdrive identifier is required.');
  if (invalid.has('mailFrom')) throw new Error('A sender address is required.');
  if (
    invalid.has('authRateLimitNamespace') ||
    invalid.has('apiRateLimitNamespace') ||
    value.authRateLimitNamespace === value.apiRateLimitNamespace
  )
    throw new Error('Distinct rate-limit namespace identifiers are required.');
  if (!parsed.success) throw new Error('Unsupported release configuration.');
  const config = parsed.data;
  return {
    version: 1,
    workerName: config.workerName,
    origin: origin.origin,
    sync,
    hyperdriveId: config.hyperdriveId,
    mailFrom: config.mailFrom,
    authRateLimitNamespace: config.authRateLimitNamespace,
    apiRateLimitNamespace: config.apiRateLimitNamespace,
  };
}

export function renderSourceWorkerConfig(
  template: unknown,
  config: ReleaseConfig,
) {
  if (
    !isRecord(template) ||
    !isRecord(template.assets) ||
    !Array.isArray(template.ratelimits)
  )
    throw new Error('Invalid Worker configuration template.');
  return {
    ...template,
    main: './worker/index.ts',
    name: config.workerName,
    no_bundle: false,
    vars: {
      AUTH_ORIGIN: config.origin,
      POWERSYNC_URL: config.sync.endpoint,
      POWERSYNC_AUDIENCE: config.sync.audience,
      MAIL_DELIVERY: 'cloudflare',
      MAIL_FROM: config.mailFrom,
    },
    assets: { ...template.assets, directory: './dist' },
    hyperdrive: [{ binding: 'ACCOUNT_DB', id: config.hyperdriveId }],
    ratelimits: template.ratelimits.map((limit: unknown) => {
      if (
        !isRecord(limit) ||
        !['AUTH_RATE_LIMIT', 'API_RATE_LIMIT'].includes(String(limit.name))
      )
        throw new Error('Unexpected rate-limit binding in the artifact.');
      return {
        ...limit,
        namespace_id:
          limit.name === 'AUTH_RATE_LIMIT'
            ? config.authRateLimitNamespace
            : config.apiRateLimitNamespace,
      };
    }),
  };
}

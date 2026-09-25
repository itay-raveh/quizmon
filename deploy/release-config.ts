import { isIP } from 'node:net';
import { z } from 'zod';
import { isRecord } from '../src/lib/validation.ts';
import {
  readSyncConnection,
  type SyncConnection,
} from '../src/domain/sync/connection.ts';

export const releaseConfigSchema = z.object({
  workerName: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
  origin: z.string().min(1),
  sync: z.object({
    endpoint: z.string().min(1),
    audience: z.string().min(1),
  }),
  hyperdriveId: z.string().regex(/^[a-fA-F0-9]{32}$/),
  mailFrom: z.email(),
  authRateLimitNamespace: z.string().regex(/^[1-9]\d*$/),
  apiRateLimitNamespace: z.string().regex(/^[1-9]\d*$/),
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
  const config = releaseConfigSchema.parse(value);
  const origin = publicUrl(config.origin);
  const sync = readSyncConnection(config.sync);
  publicUrl(sync.endpoint);
  if (origin.pathname !== '/')
    throw new Error('The application origin cannot contain a path.');
  if (/^0+$/.test(config.hyperdriveId))
    throw new Error('A provisioned Hyperdrive identifier is required.');
  if (config.authRateLimitNamespace === config.apiRateLimitNamespace)
    throw new Error('Distinct rate-limit namespace identifiers are required.');
  return {
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

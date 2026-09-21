import { isIP } from 'node:net';
import { z } from 'zod';
import { isRecord } from '../src/lib/validation.ts';
import {
  readSyncConnection,
  type SyncConnection,
} from '../src/domain/sync/connection.ts';

export const releaseConfigSchema = z.object({
  version: z.literal(1),
  workerName: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
  origin: z.string().min(1),
  sync: z.object({
    version: z.literal(1),
    endpoint: z.string().min(1),
    audience: z.string().min(1),
  }),
  hyperdriveId: z.string().regex(/^[a-fA-F0-9]{32}$/),
  mailFrom: z.string().regex(/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/),
  analyticsDataset: z.string().regex(/^[a-zA-Z0-9_]{1,64}$/),
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
  if (!isRecord(value) || value.version !== 1)
    throw new Error('Unsupported release configuration.');
  for (const key of [
    'workerName',
    'origin',
    'hyperdriveId',
    'mailFrom',
    'analyticsDataset',
    'authRateLimitNamespace',
    'apiRateLimitNamespace',
  ])
    if (typeof value[key] !== 'string' || !value[key])
      throw new Error(`Missing release configuration: ${key}.`);
  const origin = publicUrl(value.origin as string);
  const sync = readSyncConnection(value.sync);
  publicUrl(sync.endpoint);
  if (origin.pathname !== '/')
    throw new Error('The application origin cannot contain a path.');
  const parsed = releaseConfigSchema.safeParse({
    ...value,
    origin: origin.origin,
    sync,
  });
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
  if (invalid.has('analyticsDataset'))
    throw new Error('Invalid analytics dataset.');
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
    analyticsDataset: config.analyticsDataset,
    authRateLimitNamespace: config.authRateLimitNamespace,
    apiRateLimitNamespace: config.apiRateLimitNamespace,
  };
}

export function renderWorkerConfig(template: unknown, config: ReleaseConfig) {
  if (
    !isRecord(template) ||
    !isRecord(template.assets) ||
    !Array.isArray(template.ratelimits)
  )
    throw new Error('Invalid bundled Worker configuration template.');
  return {
    ...template,
    main: './worker/index.js',
    name: config.workerName,
    no_bundle: true,
    vars: {
      AUTH_ORIGIN: config.origin,
      POWERSYNC_URL: config.sync.endpoint,
      POWERSYNC_AUDIENCE: config.sync.audience,
      MAIL_DELIVERY: 'cloudflare',
      MAIL_FROM: config.mailFrom,
    },
    assets: { ...template.assets, directory: './assets' },
    hyperdrive: [{ binding: 'ACCOUNT_DB', id: config.hyperdriveId }],
    analytics_engine_datasets: [
      { binding: 'ANALYTICS', dataset: config.analyticsDataset },
    ],
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

export function renderSourceWorkerConfig(
  template: unknown,
  config: ReleaseConfig,
) {
  const rendered = renderWorkerConfig(template, config);
  return {
    ...rendered,
    main: './worker/index.ts',
    no_bundle: false,
    assets: { ...rendered.assets, directory: './dist' },
  };
}

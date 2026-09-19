import { isIP } from 'node:net';
import { isRecord } from '../src/lib/validation.ts';
import {
  readSyncConnection,
  type SyncConnection,
} from '../src/domain/sync/connection.ts';

export interface ReleaseConfig {
  version: 1;
  workerName: string;
  origin: string;
  sync: SyncConnection;
  hyperdriveId: string;
  mailFrom: string;
  analyticsDataset: string;
  authRateLimitNamespace: string;
  apiRateLimitNamespace: string;
}

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
  const config = value as unknown as ReleaseConfig;
  const origin = publicUrl(config.origin);
  const sync = readSyncConnection(value.sync);
  publicUrl(sync.endpoint);
  if (origin.pathname !== '/')
    throw new Error('The application origin cannot contain a path.');
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(config.workerName))
    throw new Error('Invalid Worker name.');
  if (
    !/^[a-f0-9]{32}$/i.test(config.hyperdriveId) ||
    /^0+$/.test(config.hyperdriveId)
  )
    throw new Error('A provisioned Hyperdrive identifier is required.');
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(config.mailFrom))
    throw new Error('A sender address is required.');
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(config.analyticsDataset))
    throw new Error('Invalid analytics dataset.');
  if (
    !/^[1-9]\d*$/.test(config.authRateLimitNamespace) ||
    !/^[1-9]\d*$/.test(config.apiRateLimitNamespace) ||
    config.authRateLimitNamespace === config.apiRateLimitNamespace
  )
    throw new Error('Distinct rate-limit namespace identifiers are required.');
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

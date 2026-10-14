import { readFile, writeFile } from 'node:fs/promises';
import { isRecord } from '../src/lib/validation.ts';
import { accountAssetHeaders } from './asset-headers.ts';
import {
  readReleaseConfig,
  renderSourceWorkerConfig,
} from './release-config.ts';
import { readProductionValues } from './production-values.ts';

const infra = process.argv[2];
if (!infra) throw new Error('Usage: prepare-worker-deploy.ts <infra-checkout>');

const values = await readProductionValues(infra);
if (!isRecord(values.runtimeConfig))
  throw new Error('Production runtime configuration is missing.');

const config = readReleaseConfig(values.runtimeConfig);
const template: unknown = JSON.parse(
  await readFile('deploy/wrangler.json', 'utf8'),
);
const rendered = renderSourceWorkerConfig(template, config);
if (process.env.SENTRY_WORKER_DSN)
  Object.assign(rendered.vars, {
    SENTRY_DSN: process.env.SENTRY_WORKER_DSN,
    SENTRY_RELEASE: process.env.GITHUB_SHA ?? '',
  });
delete (rendered as typeof rendered & { $schema?: string }).$schema;
await writeFile(
  '.wrangler.production.json',
  JSON.stringify(rendered, null, 2) + '\n',
);
await writeFile(
  'dist/_headers',
  accountAssetHeaders(
    await readFile('dist/_headers', 'utf8'),
    config.sync,
    process.env.VITE_SENTRY_DSN,
  ),
);

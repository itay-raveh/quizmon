import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, parseAllDocuments } from 'yaml';
import { isRecord } from '../src/lib/validation.ts';
import { accountAssetHeaders } from './asset-headers.ts';
import {
  readReleaseConfig,
  renderSourceWorkerConfig,
} from './release-config.ts';
import { readWorkerTemplate } from './worker-template.ts';

const infra = process.argv[2];
if (!infra) throw new Error('Usage: prepare-worker-deploy.ts <infra-checkout>');

const releases = parseAllDocuments(
  await readFile(
    join(infra, 'clusters/shire/apps/quizmon/release/app-chart.yaml'),
    'utf8',
  ),
).map((document): unknown => {
  const value: unknown = document.toJSON();
  return value;
});
const release = releases.find(
  (resource) => isRecord(resource) && resource.kind === 'HelmRelease',
);
const inputs: unknown = parse(
  await readFile(
    join(infra, 'clusters/shire/apps/quizmon/release/inputs/runtime.yaml'),
    'utf8',
  ),
);
const releaseSpec = isRecord(release) ? release.spec : undefined;
const releaseValues = isRecord(releaseSpec) ? releaseSpec.values : undefined;
const data = isRecord(inputs) ? inputs.data : undefined;
const valuesYaml = isRecord(data) ? data['values.yaml'] : undefined;
const localValues: unknown = parse(
  typeof valuesYaml === 'string' ? valuesYaml : '',
);
const publicConfig = isRecord(releaseValues)
  ? releaseValues.runtimeConfig
  : undefined;
const privateConfig = isRecord(localValues)
  ? localValues.runtimeConfig
  : undefined;
if (!isRecord(publicConfig) || !isRecord(privateConfig))
  throw new Error('Production runtime configuration is missing.');

const config = readReleaseConfig({ ...publicConfig, ...privateConfig });
const template = readWorkerTemplate('deploy/wrangler.jsonc');
const rendered = renderSourceWorkerConfig(template, config);
delete (rendered as typeof rendered & { $schema?: string }).$schema;
await writeFile(
  '.wrangler.production.json',
  JSON.stringify(rendered, null, 2) + '\n',
);
await writeFile(
  'dist/_headers',
  accountAssetHeaders(await readFile('dist/_headers', 'utf8'), config.sync),
);

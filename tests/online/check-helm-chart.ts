import assert from 'node:assert/strict';
import { parseAllDocuments, type YAMLSeq } from 'yaml';
import { checkReleaseConfigSchema } from '../../scripts/generate-release-config-schema.ts';

checkReleaseConfigSchema();

let input = '';
for await (const chunk of process.stdin) input += chunk;
const documents = parseAllDocuments(input);
const manifest = (kind: string) =>
  documents.find((document) => document.get('kind') === kind);
const job = manifest('Job');
const deployment = manifest('Deployment');
const sync = manifest('ConfigMap');
const sequence = (document: typeof job, path: (string | number)[]) =>
  (document?.getIn(path) as YAMLSeq | undefined)?.toJSON();

assert.deepEqual(
  documents.map((document) => document.get('kind')).sort(),
  ['ConfigMap', 'Deployment', 'Job', 'Service'].sort(),
);
assert.deepEqual(
  sequence(job, ['spec', 'template', 'spec', 'containers', 0, 'args']),
  ['/migration/migration-connection.json'],
);
assert.deepEqual(
  sequence(job, ['spec', 'template', 'spec', 'containers', 0, 'volumeMounts']),
  [{ name: 'migration', mountPath: '/migration', readOnly: true }],
);
assert.deepEqual(
  sequence(deployment, [
    'spec',
    'template',
    'spec',
    'initContainers',
    0,
    'args',
  ]),
  ['/opt/quizmon/deploy/powersync/sync-config.yaml', '/sync/sync-config.yaml'],
);
const config = sync?.getIn(['data', 'service.yaml']);
assert.equal(typeof config, 'string');
assert.match(config as string, /uri: !env PS_SOURCE_URI/);
assert.match(config as string, /uri: !env PS_STORAGE_URI/);
assert.equal((config as string).match(/sslmode: verify-full/g)?.length, 2);

console.log('Migration and PowerSync wiring passed.');

import assert from 'node:assert/strict';
import { parseAllDocuments, type YAMLMap, type YAMLSeq } from 'yaml';
import { checkReleaseConfigSchema } from '../../scripts/generate-release-config-schema.ts';

checkReleaseConfigSchema();

let input = '';
for await (const chunk of process.stdin) input += chunk;
const documents = parseAllDocuments(input);
const manifest = (kind: string) =>
  documents.find((document) => document.get('kind') === kind);
const job = manifest('Job');
const deployment = manifest('Deployment');
const sequence = (document: typeof job, path: (string | number)[]) =>
  (document?.getIn(path) as YAMLSeq | undefined)?.toJSON();

assert.deepEqual(
  documents.map((document) => document.get('kind')).sort(),
  ['Deployment', 'Job', 'Service'].sort(),
);
assert.equal(
  deployment?.getIn([
    'metadata',
    'annotations',
    'secret.reloader.stakater.com/reload',
  ]),
  'mongo-test,mongo-tls-test',
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
    'containers',
    0,
    'command',
  ]),
  ['node', 'server/rxdb-sync.ts'],
);
assert.equal(
  deployment?.getIn([
    'spec',
    'template',
    'spec',
    'terminationGracePeriodSeconds',
  ]),
  5,
);
assert.equal(
  deployment?.getIn([
    'spec',
    'template',
    'spec',
    'containers',
    0,
    'startupProbe',
    'periodSeconds',
  ]),
  1,
);
assert.equal(
  deployment?.getIn([
    'spec',
    'template',
    'spec',
    'containers',
    0,
    'readinessProbe',
    'periodSeconds',
  ]),
  1,
);
assert.deepEqual(
  sequence(deployment, [
    'spec',
    'template',
    'spec',
    'initContainers',
    0,
    'command',
  ]),
  [
    'sh',
    '-c',
    'cat /mongo-tls/tls.crt /mongo-tls/tls.key > /mongo-client/client.pem',
  ],
);
assert.deepEqual(
  (
    deployment?.getIn([
      'spec',
      'template',
      'spec',
      'containers',
      0,
      'env',
      3,
      'valueFrom',
      'secretKeyRef',
    ]) as YAMLMap
  )?.toJSON(),
  { name: 'mongo-test', key: 'url' },
);

console.log('Migration and RxServer wiring passed.');

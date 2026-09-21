import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { checkReleaseConfigSchema } from '../../scripts/generate-release-config-schema.ts';

checkReleaseConfigSchema();

const tooling = createRequire(resolve('node_modules/wrangler/package.json'));
const yaml = tooling('yaml') as {
  parseAllDocuments: (text: string) => Array<{ toJSON: () => unknown }>;
};
interface Manifest {
  kind: string;
  metadata: { name: string };
  data?: Record<string, string>;
  spec?: {
    type?: string;
    template: {
      spec: {
        automountServiceAccountToken: boolean;
        containers: Array<{
          image: string;
          args: string[];
          volumeMounts: Array<{ name: string; mountPath: string }>;
          securityContext: { readOnlyRootFilesystem: boolean };
        }>;
        initContainers?: Array<{ image: string; args: string[] }>;
      };
    };
  };
}
const runtimeConfig = {
  version: 1,
  workerName: 'quizmon-test',
  origin: 'https://game.example.test',
  sync: {
    version: 1,
    endpoint: 'https://sync.example.test',
    audience: 'quizmon-test',
  },
  hyperdriveId: 'a'.repeat(32),
  mailFrom: 'signin@example.test',
  authRateLimitNamespace: '2001',
  apiRateLimitNamespace: '2002',
};
const reference = (name: string) => ({ name, key: 'data', revision: '1' });
const values = {
  releaseImage: {
    repository: 'ghcr.io/example/quizmon/release',
    digest: 'sha256:' + '1'.repeat(64),
  },
  runtimeConfig,
  inputs: { migrationConnection: reference('migration-test') },
};
const root = resolve('.wrangler/accounts');
await mkdir(root, { recursive: true });
const directory = await mkdtemp(join(root, 'chart-check-'));
const chart = resolve('charts/quizmon');
const helm = (...args: string[]) =>
  execFileSync('mise', ['exec', 'helm@4.3.0', '--', 'helm', ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
const documents = (text: string) =>
  yaml
    .parseAllDocuments(text)
    .map((doc) => doc.toJSON())
    .filter(Boolean) as Manifest[];
try {
  const render = async (
    data: unknown,
    source = chart,
    extra: string[] = [],
  ) => {
    const input = join(directory, 'values.json');
    await writeFile(input, JSON.stringify(data));
    return helm(
      'template',
      'rehearsal',
      source,
      '--namespace',
      'quizmon-test',
      '-f',
      input,
      ...extra,
    );
  };
  const job = (text: string) =>
    documents(text).find((doc) => doc.kind === 'Job')!;
  const base = await render(values);
  assert.deepEqual(
    documents(base).map((doc) => doc.kind),
    ['Job'],
  );
  assert.deepEqual(job(base).spec?.template.spec.containers[0]?.args, [
    '/migration/migration-connection.json',
  ]);
  assert.deepEqual(job(base).spec?.template.spec.containers[0]?.volumeMounts, [
    { name: 'migration', mountPath: '/migration', readOnly: true },
  ]);
  assert.equal(
    job(base).metadata.name,
    job(await render(values, chart, ['--is-upgrade'])).metadata.name,
  );
  assert.equal(
    job(
      await render({
        ...values,
        runtimeConfig: { ...runtimeConfig, origin: 'https://new.example.test' },
      }),
    ).metadata.name,
    job(base).metadata.name,
  );
  const legacy = {
    ...values,
    inputs: {
      ...values.inputs,
      workerSecrets: reference('worker-test'),
      cloudflare: reference('cloudflare-test'),
    },
    release: { mode: 'deploy' },
  };
  assert.equal(
    job(await render(legacy)).metadata.name,
    job(base).metadata.name,
  );
  for (const changed of [
    {
      ...values,
      releaseImage: {
        ...values.releaseImage,
        digest: 'sha256:' + '2'.repeat(64),
      },
    },
    {
      ...values,
      inputs: {
        migrationConnection: {
          ...values.inputs.migrationConnection,
          revision: '2',
        },
      },
    },
  ]) {
    assert.notEqual(
      job(await render(changed)).metadata.name,
      job(base).metadata.name,
    );
  }
  const newer = join(directory, 'newer-chart');
  await cp(chart, newer, { recursive: true });
  await writeFile(
    join(newer, 'Chart.yaml'),
    (await readFile(join(newer, 'Chart.yaml'), 'utf8')).replace(
      'version: 0.3.0',
      'version: 0.3.1',
    ),
  );
  assert.notEqual(
    job(await render(values, newer)).metadata.name,
    job(base).metadata.name,
  );
  for (const invalid of [
    {},
    { ...values, typo: true },
    {
      ...values,
      inputs: {
        migrationConnection: { ...values.inputs.migrationConnection, name: '' },
      },
    },
    { ...values, releaseImage: { ...values.releaseImage, digest: 'latest' } },
    {
      ...values,
      runtimeConfig: { ...runtimeConfig, origin: 'http://localhost' },
    },
    { ...values, powersync: { enabled: true } },
  ]) {
    await assert.rejects(render(invalid));
  }
  const syncValues = {
    ...values,
    powersync: {
      enabled: true,
      sourceSecret: reference('source-test'),
      storageSecret: reference('storage-test'),
    },
  };
  const complete = await render(syncValues);
  const rendered = documents(complete);
  assert.deepEqual(
    rendered.map((doc) => doc.kind).sort(),
    ['ConfigMap', 'Deployment', 'Job', 'Service'].sort(),
  );
  const syncConfig = rendered.find((doc) => doc.data?.['service.yaml'])!.data![
    'service.yaml'
  ]!;
  assert.equal((syncConfig.match(/sslmode: verify-full/g) ?? []).length, 2);
  assert.ok(
    syncConfig.includes('uri: !env PS_SOURCE_URI') &&
      syncConfig.includes('uri: !env PS_STORAGE_URI'),
  );
  const deployment = rendered.find((doc) => doc.kind === 'Deployment')!;
  const compose = await readFile('compose.yaml', 'utf8');
  assert.equal(
    deployment.spec?.template.spec.containers[0]?.image,
    /image: (journeyapps\/powersync-service[^\n]+)/.exec(compose)?.[1],
  );
  assert.equal(
    deployment.spec?.template.spec.initContainers?.[0]?.image,
    job(complete).spec?.template.spec.containers[0]?.image,
  );
  assert.deepEqual(deployment.spec?.template.spec.initContainers?.[0]?.args, [
    '/opt/quizmon/deploy/powersync/sync-config.yaml',
    '/sync/sync-config.yaml',
  ]);
  for (const workload of rendered.filter((doc) =>
    ['Job', 'Deployment'].includes(doc.kind),
  )) {
    assert.equal(
      workload.spec?.template.spec.automountServiceAccountToken,
      false,
    );
    assert.equal(
      workload.spec?.template.spec.containers[0]?.securityContext
        .readOnlyRootFilesystem,
      true,
    );
  }
  assert.equal(
    rendered.find((doc) => doc.kind === 'Service')?.spec?.type,
    'ClusterIP',
  );
  const manifest = join(directory, 'rendered.yaml');
  await writeFile(manifest, complete);
  const validation = spawnSync(
    'mise',
    [
      'exec',
      'kubeconform@0.8.0',
      '--',
      'kubeconform',
      '-strict',
      '-summary',
      '-kubernetes-version',
      '1.34.0',
      manifest,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(validation.status, 0, validation.stdout + validation.stderr);
  console.log(validation.stdout.trim());
  helm('lint', '--strict', chart, '-f', join(directory, 'values.json'));
  const packaged = helm('package', chart, '--destination', directory);
  assert.match(packaged, /quizmon-0.3.0.tgz/);
  assert.equal(
    await render(syncValues, join(directory, 'quizmon-0.3.0.tgz')),
    complete,
  );
  console.log(
    'Helm passed: migration and PowerSync rendering, input rejection, strict Kubernetes validation, lint, and packaged-chart equivalence.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}

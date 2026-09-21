import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { readReleaseConfig } from '../../deploy/release-config.ts';

const tooling = createRequire(resolve('node_modules/wrangler/package.json'));
const yaml = tooling('yaml') as {
  parseAllDocuments: (text: string) => Array<{ toJSON: () => unknown }>;
};
interface Manifest {
  kind: string;
  metadata: { name: string; annotations?: Record<string, string> };
  data?: Record<string, string>;
  immutable?: boolean;
  rules?: unknown;
  subjects?: unknown;
  spec?: {
    type?: string;
    ttlSecondsAfterFinished?: number;
    template: {
      spec: {
        automountServiceAccountToken: boolean;
        containers: Array<{
          name: string;
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
  analyticsDataset: 'quizmon_test',
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
  inputs: {
    cloudflare: reference('cloudflare-test'),
    workerSecrets: reference('worker-test'),
    migrationConnection: reference('migration-test'),
  },
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
let cases = 0;
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
  const base = await render(values);
  const job = (text: string) =>
    documents(text).find((doc) => doc.kind === 'Job')!;
  assert.ok(job(base));
  assert.deepEqual(job(base).spec?.template.spec.containers[0]?.args, [
    'deploy',
    '/opt/quizmon',
    '/config/release-config.json',
    '/worker-secrets/worker-secrets.json',
    '/migration/migration-connection.json',
    '/config/operation.json',
    '/cloudflare/cloudflare.json',
  ]);
  assert.equal(job(base).metadata.annotations?.['helm.sh/hook'], undefined);
  assert.equal(job(base).spec?.ttlSecondsAfterFinished, undefined);
  assert.equal(
    job(base).metadata.name,
    job(await render(values, chart, ['--is-upgrade'])).metadata.name,
  );
  cases++;
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
      runtimeConfig: { ...runtimeConfig, origin: 'https://new.example.test' },
    },
    {
      ...values,
      inputs: {
        ...values.inputs,
        workerSecrets: { ...values.inputs.workerSecrets, revision: '2' },
      },
    },
  ]) {
    assert.notEqual(
      job(await render(changed)).metadata.name,
      job(base).metadata.name,
    );
    cases++;
  }
  const newer = join(directory, 'newer-chart');
  await cp(chart, newer, { recursive: true });
  await writeFile(
    join(newer, 'Chart.yaml'),
    (await readFile(join(newer, 'Chart.yaml'), 'utf8')).replace(
      'version: 0.2.0',
      'version: 0.2.1',
    ),
  );
  assert.notEqual(
    job(await render(values, newer)).metadata.name,
    job(base).metadata.name,
  );
  cases++;
  for (const invalid of [
    {},
    { ...values, typo: true },
    {
      ...values,
      inputs: {
        ...values.inputs,
        cloudflare: { name: '', key: 'data', revision: '1' },
      },
    },
    { ...values, releaseImage: { ...values.releaseImage, digest: 'latest' } },
    {
      ...values,
      runtimeConfig: { ...runtimeConfig, origin: 'http://localhost' },
    },
    {
      ...values,
      inputs: {
        ...values.inputs,
        workerSecrets: { ...values.inputs.workerSecrets, revision: '' },
      },
    },
    { ...values, powersync: { enabled: true } },
  ]) {
    await assert.rejects(render(invalid));
    cases++;
  }
  const readOnly = documents(
    await render({
      ...values,
      release: { mode: 'preflight' },
      inputs: {
        ...values.inputs,
        cloudflare: { name: '', key: 'cloudflare.json', revision: '' },
      },
    }),
  );
  assert.ok(
    !readOnly.some((doc) =>
      ['Role', 'RoleBinding', 'ServiceAccount'].includes(doc.kind),
    ),
  );
  assert.equal(
    readOnly.find((doc) => doc.kind === 'Job')?.spec?.template.spec
      .containers[0]?.args[0],
    'preflight',
  );
  cases++;
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
    [
      'ConfigMap',
      'ConfigMap',
      'ConfigMap',
      'Deployment',
      'Job',
      'Service',
      'ServiceAccount',
      'Role',
      'RoleBinding',
    ].sort(),
  );
  const config = rendered.find((doc) => doc.data?.['release-config.json']);
  assert.equal(config?.immutable, true);
  assert.deepEqual(
    readReleaseConfig(JSON.parse(config.data!['release-config.json']!)),
    runtimeConfig,
  );
  const selection = rendered.find(
    (doc) => doc.data?.['operation.json'] && !doc.immutable,
  )!;
  assert.equal(
    selection.data!['operation.json'],
    config.data!['operation.json'],
  );
  const role = rendered.find((doc) => doc.kind === 'Role')!;
  assert.deepEqual(role.rules, [
    {
      apiGroups: [''],
      resources: ['configmaps'],
      resourceNames: [selection.metadata.name],
      verbs: ['get'],
    },
  ]);
  assert.deepEqual(
    rendered.find((doc) => doc.kind === 'RoleBinding')!.subjects,
    [
      {
        kind: 'ServiceAccount',
        name: selection.metadata.name,
        namespace: 'quizmon-test',
      },
    ],
  );
  const operation = JSON.parse(config.data!['operation.json']!) as {
    artifact: string;
    id: string;
  };
  assert.equal(operation.artifact, values.releaseImage.digest);
  assert.match(operation.id, /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
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
  cases++;
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
  assert.match(packaged, /quizmon-0.2.0.tgz/);
  assert.equal(
    await render(syncValues, join(directory, 'quizmon-0.2.0.tgz')),
    complete,
  );
  console.log(
    `Helm passed: ${cases} rendering/upgrade/rejection cases, strict Kubernetes validation, lint, and packaged-chart equivalence.`,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { stringify } from 'yaml';
import { readProductionValues } from '../../deploy/production-values.ts';

await test('production values merge Flux layers and preserve the bundled image', async () => {
  const infra = await mkdtemp(join(tmpdir(), 'quizmon-values-'));
  const directory = join(infra, 'clusters/shire/apps/quizmon/release');
  const reference = {
    kind: 'ConfigMap',
    name: 'quizmon-runtime',
    valuesKey: 'values.yaml',
  };
  const values = {
    runtimeConfig: { sync: { audience: 'production' } },
    releaseImage: {
      repository: 'ghcr.io/itay-raveh/quizmon',
      digest: `sha256:${'a'.repeat(64)}`,
    },
  };
  const chart = { spec: { sourceRef: { kind: 'GitRepository' } } };
  const writeRelease = async () =>
    writeFile(
      join(directory, 'app-chart.yaml'),
      stringify({
        kind: 'HelmRelease',
        spec: { chart, valuesFrom: [reference], values },
      }),
    );
  const writeInputs = async (input: unknown) =>
    writeFile(
      join(directory, 'inputs/runtime.yaml'),
      stringify({
        kind: 'ConfigMap',
        metadata: { name: reference.name },
        data: { 'values.yaml': stringify(input) },
      }),
    );
  try {
    await mkdir(join(directory, 'inputs'), { recursive: true });
    await writeRelease();
    await writeInputs({
      runtimeConfig: {
        sync: { endpoint: 'https://sync.example.test', audience: 'base' },
      },
      inputs: { migrationConnection: { name: 'production-migration' } },
    });
    assert.deepEqual(await readProductionValues(infra), {
      runtimeConfig: {
        sync: { endpoint: 'https://sync.example.test', audience: 'production' },
      },
      inputs: { migrationConnection: { name: 'production-migration' } },
    });
    chart.spec.sourceRef.kind = 'OCIRepository';
    await writeRelease();
    await assert.rejects(
      readProductionValues(infra),
      /Unexpected production release image override/,
    );
    chart.spec.sourceRef.kind = 'GitRepository';
    values.releaseImage.repository = 'ghcr.io/other/image';
    await writeRelease();
    await assert.rejects(
      readProductionValues(infra),
      /Unexpected production release image override/,
    );
    values.releaseImage.repository = 'ghcr.io/itay-raveh/quizmon';
    await writeRelease();
    await writeInputs({ releaseImage: values.releaseImage });
    await assert.rejects(
      readProductionValues(infra),
      /cannot override the release image/,
    );
    reference.kind = 'Secret';
    await writeRelease();
    await assert.rejects(
      readProductionValues(infra),
      /Unsupported production valuesFrom/,
    );
  } finally {
    await rm(infra, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parse, parseAllDocuments, stringify } from 'yaml';

await test('release chart binds the image and rejects incompatible production values', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'quizmon-chart-'));
  const release = join(temporary, 'clusters/shire/apps/quizmon/release');
  const output = join(temporary, 'chart');
  const image = `ghcr.io/itay-raveh/quizmon@sha256:${'a'.repeat(64)}`;
  const revision = 'b'.repeat(40);
  const values = parse(
    await readFile('tests/online/chart-values.yaml', 'utf8'),
  ) as {
    releaseImage?: unknown;
    runtimeConfig: { sync: { endpoint?: string } };
  };
  delete values.releaseImage;
  const writeRelease = () =>
    writeFile(
      join(release, 'app-chart.yaml'),
      stringify({
        kind: 'HelmRelease',
        spec: {
          valuesFrom: [
            {
              kind: 'ConfigMap',
              name: 'quizmon-runtime',
              valuesKey: 'values.yaml',
            },
          ],
          values,
        },
      }),
    );
  const prepare = (version: string, reference = image) =>
    execFileSync(
      process.execPath,
      [
        'deploy/prepare-release-chart.ts',
        temporary,
        reference,
        version,
        revision,
        output,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  const migrationName = async () =>
    parseAllDocuments(
      await readFile(join(output, 'production-rendered.yaml'), 'utf8'),
    )
      .find((document) => document.get('kind') === 'Job')
      ?.getIn(['metadata', 'name']);
  try {
    await mkdir(join(release, 'inputs'), { recursive: true });
    await mkdir(join(temporary, 'tofu'));
    await writeFile(
      join(temporary, 'tofu/locals.tf'),
      'locals {\n  kubernetes_version = "v1.35.2"\n}\n',
    );
    await writeRelease();
    await writeFile(
      join(release, 'inputs/runtime.yaml'),
      stringify({
        kind: 'ConfigMap',
        metadata: { name: 'quizmon-runtime' },
        data: { 'values.yaml': '{}' },
      }),
    );
    prepare('0.101.1');
    assert.equal(
      parseAllDocuments(
        await readFile(join(output, 'quizmon/Chart.yaml'), 'utf8'),
      )[0]?.get('appVersion'),
      revision,
    );
    assert.deepEqual(
      (
        parse(await readFile(join(output, 'quizmon/values.yaml'), 'utf8')) as {
          releaseImage: unknown;
        }
      ).releaseImage,
      { repository: image.split('@')[0], digest: image.split('@')[1] },
    );
    const previousJob = await migrationName();
    prepare('0.101.2');
    assert.notEqual(
      await migrationName(),
      previousJob,
      'A chart-only release needs a new migration Job.',
    );
    assert.throws(
      () => prepare('0.101.3', 'ghcr.io/itay-raveh/quizmon:main'),
      /Usage:/,
    );
    delete values.runtimeConfig.sync.endpoint;
    await writeRelease();
    assert.throws(
      () => prepare('0.101.3'),
      (error: unknown) => {
        assert.match(
          (error as { stdout: string }).stdout,
          /runtimeConfig\/sync.*endpoint/,
        );
        return true;
      },
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

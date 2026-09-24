import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

await test('release preparation rejects a malformed later YAML document', async () => {
  const infra = await mkdtemp(join(tmpdir(), 'quizmon-release-'));
  const release = join(infra, 'clusters/shire/apps/quizmon/release');
  try {
    await mkdir(release, { recursive: true });
    await writeFile(
      join(release, 'app-chart.yaml'),
      'kind: HelmRelease\nspec:\n  values: {}\n---\ninvalid: [\n',
    );
    assert.throws(
      () =>
        execFileSync(process.execPath, [
          'deploy/prepare-worker-deploy.ts',
          infra,
        ]),
      /YAMLParseError/,
    );
  } finally {
    await rm(infra, { recursive: true, force: true });
  }
});

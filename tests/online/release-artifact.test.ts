import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { test } from 'node:test';
import { sealArtifact, verifyArtifact } from '../../deploy/release-artifact.ts';

await test('sealed candidate rejects changed, missing, and added payload files', async () => {
  const candidate = process.env.QUIZMON_RELEASE_ARTIFACT;
  assert.ok(
    candidate,
    'Set QUIZMON_RELEASE_ARTIFACT to a freshly packaged candidate.',
  );
  const testRoot = fileURLToPath(
    new URL('../../.wrangler/accounts/', import.meta.url),
  );
  await mkdir(testRoot, { recursive: true });
  const fixture = await mkdtemp(join(testRoot, 'artifact-check-'));
  try {
    await cp(candidate, fixture, { recursive: true });
    const manifest = await verifyArtifact(fixture);
    assert.equal(manifest.version, 1);
    const worker = join(fixture, 'worker/index.js');
    const original = await readFile(worker);
    await writeFile(
      worker,
      Buffer.concat([original, Buffer.from('\n// changed\n')]),
    );
    await assert.rejects(verifyArtifact(fixture), /checksum mismatch/);
    await writeFile(worker, original);
    await writeFile(join(fixture, 'worker/unexpected.js'), 'export {};');
    await assert.rejects(verifyArtifact(fixture), /checksum mismatch/);
    await rm(join(fixture, 'worker/unexpected.js'));
    await rm(worker);
    await assert.rejects(verifyArtifact(fixture), /checksum mismatch/);
    await writeFile(worker, original);
    await verifyArtifact(fixture);
    const path = join(fixture, 'manifest.json');
    await writeFile(path, JSON.stringify({ ...manifest, migrations: [] }));
    await assert.rejects(verifyArtifact(fixture), /migration identities/);
    await writeFile(path, JSON.stringify({ ...manifest, version: 99 }));
    await assert.rejects(verifyArtifact(fixture), /Unsupported/);
    await assert.rejects(
      sealArtifact(fixture, { revision: 'main', dirty: false }),
      /full source revision/,
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

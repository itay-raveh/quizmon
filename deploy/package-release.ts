import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWorkerTemplate } from './worker-template.ts';
import { sealArtifact, verifyArtifact } from './release-artifact.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const [destination, bundle] = process.argv.slice(2);
if (!destination || !bundle)
  throw new Error(
    'Usage: package-release.ts <new-output-directory> <prebuilt-worker-directory>',
  );
const output = resolve(destination);
await mkdir(output, { recursive: false });
const copy = async (source: string, target: string) => {
  await mkdir(dirname(join(output, target)), { recursive: true });
  await cp(source, join(output, target), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
};
const rootPackage = JSON.parse(
  await readFile(join(root, 'package.json'), 'utf8'),
) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const runtimePackage = JSON.parse(
  await readFile(join(root, 'deploy/runtime/package.json'), 'utf8'),
) as { dependencies: Record<string, string> };
for (const [name, version] of Object.entries(runtimePackage.dependencies))
  if (
    version !==
    (rootPackage.dependencies[name] ?? rootPackage.devDependencies[name])
  )
    throw new Error(
      `Release dependency ${name} differs from the tested application tooling.`,
    );
await copy(join(root, 'dist'), 'assets');
await copy(resolve(bundle, 'index.js'), 'worker/index.js');
await copy(resolve(bundle, 'index.js.map'), 'worker/index.js.map');
for (const file of ['package.json', 'package-lock.json', 'Dockerfile'])
  await copy(join(root, 'deploy/runtime', file), file);
for (const path of [
  'server/migrations',
  'deploy/powersync/sync-config.yaml',
  'deploy/release-artifact.ts',
  'deploy/release-command.ts',
  'deploy/prepare-release.ts',
  'deploy/execute-release.ts',
  'deploy/release-selection.ts',
  'deploy/release-config.ts',
  'deploy/release-inputs.ts',
  'deploy/release-preflight.ts',
  'deploy/migration-runner.ts',
  'deploy/release-lock.ts',
  'deploy/release-coordinator.ts',
  'deploy/cloudflare-release.ts',
  'deploy/release-process.ts',
  'deploy/publication.ts',
  'deploy/asset-headers.ts',
  'src/domain/sync/connection.ts',
  'src/features/reminders/reminder-config.ts',
  'src/lib/validation.ts',
])
  await copy(join(root, path), path);
await writeFile(
  join(output, '.dockerignore'),
  '**\n!assets/**\n!worker/**\n!server/**\n!deploy/**\n!src/**\n!package.json\n!package-lock.json\n!manifest.json\n!Dockerfile\n',
);
const rawConfig = readWorkerTemplate(join(root, 'deploy/wrangler.jsonc'));
delete rawConfig.$schema;
await writeFile(
  join(output, 'worker/template.json'),
  JSON.stringify(rawConfig, null, 2) + '\n',
);
const manifest = await sealArtifact(output, {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  dirty: Boolean(
    execFileSync('git', ['status', '--porcelain'], {
      cwd: root,
      encoding: 'utf8',
    }).trim(),
  ),
});
await verifyArtifact(output);
console.log(
  JSON.stringify({
    directory: output,
    files: Object.keys(manifest.files).length,
    source: manifest.source,
  }),
);

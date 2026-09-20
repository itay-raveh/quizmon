import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { isRecord } from '../src/lib/validation.ts';
import { verifyArtifact } from './release-artifact.ts';
import { readReleaseConfig } from './release-config.ts';
import { readMigrationConnection } from './release-inputs.ts';
import { preflightRelease } from './release-preflight.ts';
import { prepareRelease } from './prepare-release.ts';
import { cloudflareRelease } from './cloudflare-release.ts';
import {
  coordinateRelease,
  readOperation,
  type ReleaseOperation,
} from './release-coordinator.ts';
import { publishPlayerTables } from './publication.ts';

export interface ExecuteReleaseOptions {
  artifactRoot: string;
  configFile: string;
  secretsFile: string;
  databaseFile: string;
  operation: ReleaseOperation;
  cloudflare: { accountId: string; token: string };
  assertSelected: (operation: ReleaseOperation) => Promise<void>;
  temporaryRoot?: string;
}

export async function executeRelease(
  options: ExecuteReleaseOptions,
  createDeployment: typeof cloudflareRelease = cloudflareRelease,
) {
  const root = resolve(options.artifactRoot);
  const manifest = await verifyArtifact(root);
  if (
    !isRecord(manifest.source) ||
    manifest.source.dirty !== false ||
    typeof manifest.source.revision !== 'string' ||
    !/^[a-f0-9]{40}$/.test(manifest.source.revision)
  )
    throw new Error('Deployment requires an artifact from a clean revision.');
  const operation = readOperation(options.operation);
  const temporaryRoot = options.temporaryRoot ?? tmpdir();
  await mkdir(temporaryRoot, { recursive: true });
  const temporary = await mkdtemp(join(temporaryRoot, 'quizmon-release-'));
  try {
    // Mounted Secrets can rotate while a Job runs. Validate and deploy the same bytes.
    const snapshot = async (source: string, name: string) => {
      const target = join(temporary, name);
      await writeFile(target, await readFile(source), { mode: 0o600 });
      return target;
    };
    const configFile = await snapshot(options.configFile, 'config.json');
    const secretsFile = await snapshot(options.secretsFile, 'secrets.json');
    const databaseFile = await snapshot(options.databaseFile, 'database.json');
    const config = readReleaseConfig(
      JSON.parse(await readFile(configFile, 'utf8')),
    );
    const connection = readMigrationConnection(
      JSON.parse(await readFile(databaseFile, 'utf8')),
    );
    const deployment = createDeployment({
      ...options.cloudflare,
      workerName: config.workerName,
      operation,
      requestTimeoutMs: 30_000,
    });
    const preparedDirectory = join(temporary, 'prepared');
    return await coordinateRelease({
      connection,
      operation,
      migrationsFolder: join(root, 'server/migrations'),
      preflight: async () => {
        await preflightRelease(root, configFile, secretsFile, databaseFile);
        await prepareRelease(root, configFile, preparedDirectory);
      },
      assertSelected: options.assertSelected,
      configure: publishPlayerTables,
      activate: (_, signal) =>
        deployment.activate({
          artifactRoot: root,
          preparedDirectory,
          secretsFile,
          temporaryRoot: temporary,
          timeoutMs: 180_000,
          signal,
          assertSelected: () => options.assertSelected(operation),
        }),
      inspectActivation: (signal) => deployment.inspect(undefined, signal),
      verifyDeployment: (receipt) => deployment.verify(receipt),
    });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

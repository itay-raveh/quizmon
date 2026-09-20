import { readFile } from 'node:fs/promises';
import { executeRelease } from './execute-release.ts';
import { releaseSelection } from './release-selection.ts';
import {
  readOperation,
  PendingActivationError,
  ActivationNotStartedError,
} from './release-coordinator.ts';
import { readCloudflareConnection } from './release-inputs.ts';
import { resolve } from 'node:path';
import { verifyArtifact } from './release-artifact.ts';
import { prepareRelease, readPreparedRelease } from './prepare-release.ts';
import { preflightRelease, readReleaseInputs } from './release-preflight.ts';

const [
  command,
  directory = '.',
  configFile,
  destination,
  databaseFile,
  operationFile,
  cloudflareFile,
] = process.argv.slice(2);
if (!['verify', 'prepare', 'preflight', 'deploy'].includes(command ?? ''))
  throw new Error(
    'Usage: release-command.ts verify <artifact> | prepare <artifact> <config.json> <new-output-directory> | preflight <artifact> <config.json> <worker-secrets.json> <migration-connection.json> | deploy <artifact> <config.json> <worker-secrets.json> <migration-connection.json> <operation.json> <cloudflare.json>',
  );
const root = resolve(directory);
const manifest = command === 'deploy' ? undefined : await verifyArtifact(root);
if (command === 'deploy') {
  try {
    if (
      !configFile ||
      !destination ||
      !databaseFile ||
      !operationFile ||
      !cloudflareFile
    )
      throw new Error('Release input files are required.');
    const credentialsDirectory =
      '/var/run/secrets/kubernetes.io/serviceaccount';
    const namespace = (
      await readFile(credentialsDirectory + '/namespace', 'utf8')
    ).trim();
    const assertSelected = releaseSelection({
      endpoint: 'https://kubernetes.default.svc',
      namespace,
      configMap: process.env.QUIZMON_SELECTION_CONFIGMAP ?? '',
      credentialsDirectory,
    });
    const { source, ...release } = await executeRelease({
      artifactRoot: root,
      configFile,
      secretsFile: destination,
      databaseFile,
      operation: readOperation(
        JSON.parse(await readFile(operationFile, 'utf8')),
      ),
      cloudflare: readCloudflareConnection(
        JSON.parse(await readFile(cloudflareFile, 'utf8')),
      ),
      assertSelected,
    });
    console.log(JSON.stringify({ release, source }));
  } catch (error) {
    console.error(
      error instanceof PendingActivationError ||
        error instanceof ActivationNotStartedError
        ? error.message
        : 'Release failed. Check the selected operation, input files, database permissions, and release journal before retrying.',
    );
    process.exitCode = 1;
  }
} else if (command === 'preflight') {
  if (!configFile || !destination || !databaseFile)
    throw new Error(
      'Release configuration, Worker secrets, and migration connection files are required.',
    );
  console.log(
    JSON.stringify({
      preflight: await preflightRelease(
        await readReleaseInputs(root, configFile, destination, databaseFile),
      ),
      source: manifest!.source,
    }),
  );
} else if (command === 'prepare') {
  if (!configFile || !destination)
    throw new Error('Configuration and a new output directory are required.');
  await prepareRelease(
    root,
    await readPreparedRelease(root, configFile),
    destination,
  );
  console.log(JSON.stringify({ prepared: true, source: manifest!.source }));
} else
  console.log(
    JSON.stringify({
      verified: true,
      source: manifest!.source,
      migrations: manifest!.migrations,
    }),
  );

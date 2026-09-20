import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { accountAssetHeaders } from './asset-headers.ts';
import { readReleaseConfig, renderWorkerConfig } from './release-config.ts';

export async function readPreparedRelease(root: string, configFile: string) {
  const config = readReleaseConfig(
    JSON.parse(await readFile(configFile, 'utf8')),
  );
  const template: unknown = JSON.parse(
    await readFile(join(root, 'worker/template.json'), 'utf8'),
  );
  const workerConfig = renderWorkerConfig(template, config);
  const headers = accountAssetHeaders(
    await readFile(join(root, 'assets/_headers'), 'utf8'),
    config.sync,
  );
  return { config, workerConfig, headers };
}

export async function prepareRelease(
  root: string,
  { workerConfig, headers }: Awaited<ReturnType<typeof readPreparedRelease>>,
  destination: string,
) {
  const output = resolve(destination);
  await mkdir(output, { recursive: false });
  await cp(join(root, 'assets'), join(output, 'assets'), { recursive: true });
  await cp(join(root, 'worker'), join(output, 'worker'), { recursive: true });
  await writeFile(join(output, 'assets/_headers'), headers);
  await writeFile(
    join(output, 'wrangler.json'),
    JSON.stringify(workerConfig, null, 2) + '\n',
  );
}

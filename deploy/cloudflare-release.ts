import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isRecord } from '../src/lib/validation.ts';
import {
  ActivationNotStartedError,
  PendingActivationError,
  readOperation,
  type ReleaseOperation,
  type DeploymentReceipt,
} from './release-coordinator.ts';
import { runReleaseProcess } from './release-process.ts';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const maxBytes = 1024 * 1024;

export function releaseMessage(operation: ReleaseOperation) {
  return JSON.stringify(readOperation(operation));
}

export function deployedVersion(output: string, workerName: string) {
  if (Buffer.byteLength(output) > maxBytes) throw new PendingActivationError();
  try {
    const records: unknown[] = output
      .split('\n')
      .filter((line) => line.trim())
      .map((line): unknown => JSON.parse(line));
    const deployments = records.filter(
      (entry) => isRecord(entry) && entry.type === 'deploy',
    );
    const entry = deployments[0];
    if (
      deployments.length !== 1 ||
      !isRecord(entry) ||
      entry.version !== 1 ||
      entry.worker_name !== workerName ||
      typeof entry.version_id !== 'string' ||
      !uuid.test(entry.version_id) ||
      (entry.wrangler_environment !== undefined &&
        entry.wrangler_environment !== null) ||
      entry.worker_name_overridden === true
    )
      throw new PendingActivationError();
    return entry.version_id;
  } catch {
    throw new PendingActivationError();
  }
}

export function cloudflareRelease(options: {
  accountId: string;
  token: string;
  workerName: string;
  operation: ReleaseOperation;
  requestTimeoutMs: number;
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
}) {
  const operation = readOperation(options.operation);
  if (
    !/^[a-f0-9]{32}$/i.test(options.accountId) ||
    !/^[a-z0-9][a-z0-9-]{0,62}$/.test(options.workerName) ||
    !options.token ||
    /\s/.test(options.token) ||
    !Number.isSafeInteger(options.requestTimeoutMs) ||
    options.requestTimeoutMs <= 0 ||
    options.requestTimeoutMs > 2_147_483_647
  )
    throw new Error('Invalid Cloudflare release connection.');
  const base = `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/workers/scripts/${options.workerName}`;
  const request = options.fetch ?? fetch;
  const get = async (path: string, signal?: AbortSignal) => {
    try {
      const response = await request(base + path, {
        headers: { Authorization: 'Bearer ' + options.token },
        redirect: 'error',
        signal: AbortSignal.any([
          AbortSignal.timeout(options.requestTimeoutMs),
          ...(signal ? [signal] : []),
        ]),
      });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new PendingActivationError();
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) throw new PendingActivationError();
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const envelope: unknown = JSON.parse(
        Buffer.concat(chunks).toString('utf8'),
      );
      if (
        !isRecord(envelope) ||
        envelope.success !== true ||
        !isRecord(envelope.result)
      )
        throw new PendingActivationError();
      return envelope.result;
    } catch {
      throw new PendingActivationError();
    }
  };
  const inspect = async (
    expectedVersion?: string,
    signal?: AbortSignal,
  ): Promise<DeploymentReceipt> => {
    if (expectedVersion !== undefined && !uuid.test(expectedVersion))
      throw new PendingActivationError();
    const result = await get('/deployments', signal);
    const latest: unknown = Array.isArray(result.deployments)
      ? result.deployments[0]
      : undefined;
    if (
      !isRecord(latest) ||
      typeof latest.id !== 'string' ||
      !uuid.test(latest.id) ||
      latest.strategy !== 'percentage' ||
      !Array.isArray(latest.versions) ||
      latest.versions.length !== 1
    )
      throw new PendingActivationError();
    const version: unknown = latest.versions[0];
    if (
      !isRecord(version) ||
      version.percentage !== 100 ||
      typeof version.version_id !== 'string' ||
      !uuid.test(version.version_id) ||
      (expectedVersion !== undefined && version.version_id !== expectedVersion)
    )
      throw new PendingActivationError();
    const detail = await get('/versions/' + version.version_id, signal);
    if (
      detail.id !== version.version_id ||
      !isRecord(detail.annotations) ||
      detail.annotations['workers/message'] !== releaseMessage(operation)
    )
      throw new PendingActivationError();
    return { deploymentId: latest.id, versionId: version.version_id };
  };
  return {
    inspect,
    async verify(receipt: DeploymentReceipt, signal?: AbortSignal) {
      if (!uuid.test(receipt.deploymentId)) throw new PendingActivationError();
      const active = await inspect(receipt.versionId, signal);
      if (active.deploymentId !== receipt.deploymentId)
        throw new PendingActivationError();
    },
    async activate(input: {
      artifactRoot: string;
      preparedDirectory: string;
      secretsFile: string;
      temporaryRoot: string;
      timeoutMs: number;
      signal: AbortSignal;
      assertSelected: () => Promise<void>;
    }) {
      if (input.signal.aborted) throw new ActivationNotStartedError();
      const prepared = resolve(input.preparedDirectory);
      const config: unknown = JSON.parse(
        await readFile(join(prepared, 'wrangler.json'), 'utf8'),
      );
      if (
        !isRecord(config) ||
        config.name !== options.workerName ||
        config.no_bundle !== true ||
        (config.account_id !== undefined &&
          config.account_id !== options.accountId)
      )
        throw new ActivationNotStartedError();
      await mkdir(input.temporaryRoot, { recursive: true });
      const temporary = await mkdtemp(
        join(resolve(input.temporaryRoot), 'cloudflare-release-'),
      );
      try {
        const output = join(temporary, 'output.ndjson');
        try {
          await input.assertSelected();
        } catch {
          throw new ActivationNotStartedError();
        }
        await runReleaseProcess({
          command: process.execPath,
          // Invoke the pinned CLI directly so cancellation targets its process group.
          args: [
            join(
              resolve(input.artifactRoot),
              'node_modules/wrangler/wrangler-dist/cli.js',
            ),
            'deploy',
            '--config',
            join(prepared, 'wrangler.json'),
            '--secrets-file',
            resolve(input.secretsFile),
            '--message',
            releaseMessage(operation),
          ],
          cwd: prepared,
          env: {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            TMPDIR: process.env.TMPDIR,
            CI: 'true',
            CLOUDFLARE_ACCOUNT_ID: options.accountId,
            CLOUDFLARE_API_TOKEN: options.token,
            WRANGLER_SEND_METRICS: 'false',
            WRANGLER_OUTPUT_FILE_PATH: output,
            WRANGLER_LOG_PATH: join(temporary, 'wrangler.log'),
          },
          signal: input.signal,
          timeoutMs: input.timeoutMs,
        });
        if ((await stat(output)).size > maxBytes)
          throw new PendingActivationError();
        return await inspect(
          deployedVersion(await readFile(output, 'utf8'), options.workerName),
          input.signal,
        );
      } finally {
        await rm(temporary, { recursive: true, force: true });
      }
    },
  };
}

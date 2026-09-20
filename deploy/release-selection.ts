import { readFile } from 'node:fs/promises';
import { request } from 'node:https';
import { join } from 'node:path';
import { isRecord } from '../src/lib/validation.ts';
import { readOperation, type ReleaseOperation } from './release-coordinator.ts';

export function releaseSelection(options: {
  endpoint: string;
  namespace: string;
  configMap: string;
  credentialsDirectory: string;
}) {
  const endpoint = new URL(options.endpoint);
  const name = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== '/' ||
    endpoint.search ||
    endpoint.hash ||
    !name.test(options.namespace) ||
    !name.test(options.configMap)
  )
    throw new Error('Invalid release-selection connection.');
  const url = new URL(
    `/api/v1/namespaces/${options.namespace}/configmaps/${options.configMap}`,
    endpoint,
  );
  return async (operation: ReleaseOperation) => {
    try {
      const token = (
        await readFile(join(options.credentialsDirectory, 'token'), 'utf8')
      ).trim();
      const ca = await readFile(join(options.credentialsDirectory, 'ca.crt'));
      const body = await new Promise<string>((resolve, reject) => {
        const req = request(
          url,
          {
            method: 'GET',
            ca,
            rejectUnauthorized: true,
            headers: { Authorization: 'Bearer ' + token },
            signal: AbortSignal.timeout(10_000),
          },
          (response) => {
            if (response.statusCode !== 200) {
              response.resume();
              reject(new Error('Release selection is unavailable.'));
              return;
            }
            const chunks: Buffer[] = [];
            let bytes = 0;
            response.on('data', (chunk: Buffer) => {
              bytes += chunk.length;
              if (bytes > 64 * 1024) {
                response.destroy(new Error('Release selection is too large.'));
                return;
              }
              chunks.push(chunk);
            });
            response.on('error', reject);
            response.on('end', () =>
              resolve(Buffer.concat(chunks).toString('utf8')),
            );
          },
        );
        req.on('error', reject);
        req.end();
      });
      const value: unknown = JSON.parse(body);
      if (
        !isRecord(value) ||
        !isRecord(value.data) ||
        typeof value.data['operation.json'] !== 'string'
      )
        throw new Error();
      const selected = readOperation(JSON.parse(value.data['operation.json']));
      if (JSON.stringify(selected) !== JSON.stringify(readOperation(operation)))
        throw new Error();
    } catch {
      throw new Error(
        'This release is no longer selected, or its selection could not be verified.',
      );
    }
  };
}

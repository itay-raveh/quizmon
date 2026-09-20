import { experimental_readRawConfig } from 'wrangler';
import { isRecord } from '../src/lib/validation.ts';

export function readWorkerTemplate(config: string) {
  // Wrangler 4.127.1's declaration re-exports an unshipped workers-utils type.
  const read = experimental_readRawConfig as (options: {
    config: string;
  }) => unknown;
  const result = read({ config });
  if (!isRecord(result) || !isRecord(result.rawConfig))
    throw new Error('Wrangler did not return a Worker configuration.');
  return result.rawConfig;
}

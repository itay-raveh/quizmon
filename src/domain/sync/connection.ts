import { isRecord } from '../../lib/validation.ts';

export interface SyncConnection {
  endpoint: string;
  audience: string;
}

export function readSyncConnection(value: unknown): SyncConnection {
  if (
    !isRecord(value) ||
    typeof value.endpoint !== 'string' ||
    typeof value.audience !== 'string' ||
    !value.audience.trim() ||
    value.audience.length > 2048
  )
    throw new Error('The account service returned invalid sync configuration.');
  const endpoint = new URL(value.endpoint);
  if (
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    (endpoint.protocol !== 'https:' &&
      !(
        endpoint.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
      ))
  )
    throw new Error('The account service returned an unsafe sync endpoint.');
  return {
    endpoint: endpoint.href.replace(/\/+$/, ''),
    audience: value.audience,
  };
}

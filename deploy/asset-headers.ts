import { readSyncConnection } from '../src/domain/sync/connection.ts';

export function accountAssetHeaders(template: string, connection: unknown) {
  const sync = readSyncConnection(connection);
  const http = new URL(sync.endpoint);
  const websocket = new URL(sync.endpoint);
  websocket.protocol = http.protocol === 'https:' ? 'wss:' : 'ws:';
  let policies = 0;
  const headers = template.replace(
    /connect-src ([^;\n]+)/g,
    (_, sources: string) => {
      policies++;
      return (
        'connect-src ' +
        [
          ...new Set([
            ...sources.trim().split(/\s+/),
            http.origin,
            websocket.origin,
          ]),
        ].join(' ')
      );
    },
  );
  if (policies !== 1) throw new Error('Expected one game connect-src policy.');
  return headers;
}

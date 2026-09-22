import { readSyncConnection } from '../src/domain/sync/connection.ts';

export function accountAssetHeaders(
  template: string,
  connection: unknown,
  sentryDsn?: string,
) {
  const sync = readSyncConnection(connection);
  const http = new URL(sync.endpoint);
  const websocket = new URL(sync.endpoint);
  websocket.protocol = http.protocol === 'https:' ? 'wss:' : 'ws:';
  const sentry = sentryDsn ? new URL(sentryDsn) : undefined;
  if (sentry && sentry.protocol !== 'https:')
    throw new Error('Sentry ingestion must use HTTPS.');
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
            ...(sentry ? [sentry.origin] : []),
          ]),
        ].join(' ')
      );
    },
  );
  if (policies !== 1) throw new Error('Expected one game connect-src policy.');
  return headers;
}

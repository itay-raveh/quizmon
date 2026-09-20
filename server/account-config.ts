import {
  readSyncConnection,
  type SyncConnection,
} from '../src/domain/sync/connection.ts';

const localHosts = ['localhost', '127.0.0.1', '[::1]', 'host.docker.internal'];

export function accountRuntime(config: {
  origin: string;
  secret: string;
  sync: SyncConnection;
  mail: { mode: string };
}) {
  const origin = new URL(config.origin);
  const sync = readSyncConnection(config.sync);
  if (
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== '/'
  )
    throw new Error('Invalid account origin.');
  const local = localHosts.includes(origin.hostname);
  if (!['cloudflare', 'test-mailbox'].includes(config.mail.mode))
    throw new Error('Invalid mail delivery mode.');
  if (
    !local &&
    (origin.protocol !== 'https:' ||
      new URL(sync.endpoint).protocol !== 'https:' ||
      localHosts.includes(new URL(sync.endpoint).hostname) ||
      config.mail.mode !== 'cloudflare' ||
      typeof config.secret !== 'string' ||
      config.secret.length < 32)
  )
    throw new Error(
      'Public accounts require HTTPS endpoints, configured email delivery, and an authentication secret.',
    );
  if (local && !['http:', 'https:'].includes(origin.protocol))
    throw new Error('Invalid local account protocol.');
  return {
    local,
    sync,
    accepts(url: string) {
      const requested = new URL(url);
      return local
        ? localHosts.includes(requested.hostname)
        : requested.origin === origin.origin;
    },
  };
}

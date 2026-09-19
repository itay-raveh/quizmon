import { serve } from '@hono/node-server';
import { preview } from 'vite';
import { createAccountApi } from '../../server/api.ts';
import { localEnv } from '../../scripts/dev/local-env.ts';
import { localSync } from '../../scripts/dev/local-sync.ts';
import { SPRITE_SOURCE } from '../../src/domain/pokemon/sprite-source.ts';

export async function startBrowserOrigin() {
  const api = serve({
    fetch: (request) => app.fetch(request),
    hostname: '127.0.0.1',
    port: 0,
  });
  if (!api.listening)
    await new Promise<void>((resolve) => api.once('listening', resolve));
  const address = api.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing test API port.');
  const { httpServer } = await preview({
    configFile: false,
    logLevel: 'silent',
    build: { outDir: 'dist' },
    preview: {
      host: '127.0.0.1',
      port: 0,
      proxy: {
        '/api': { target: `http://127.0.0.1:${address.port}` },
        '/sync-data': {
          target: localSync.endpoint,
          rewrite: (path) => path.replace(/^\/sync-data/, ''),
        },
        '/sprites': { target: SPRITE_SOURCE, changeOrigin: true },
      },
    },
  });
  const web = httpServer.address();
  if (!web || typeof web === 'string')
    throw new Error('Missing test origin port.');
  const origin = `http://127.0.0.1:${web.port}`;
  const app = createAccountApi({
    origin,
    sync: { ...localSync, endpoint: `${origin}/sync-data` },
    connectionString:
      'postgresql://postgres:unused@127.0.0.1:5548/quizmon_pilot',
    secret: localEnv.BETTER_AUTH_SECRET!,
    mail: { mode: 'test-mailbox' },
  });
  const stop = async () => {
    if (!httpServer.listening) return;
    const closed = new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve())),
    );
    if ('closeAllConnections' in httpServer) httpServer.closeAllConnections();
    await closed;
  };
  return {
    origin,
    stop,
    close: async () => {
      await stop();
      api.close();
    },
  };
}

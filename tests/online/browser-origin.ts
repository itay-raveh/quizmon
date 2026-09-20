import { freePort, startAccountWorker } from './account-fixture.ts';
import { preview } from 'vite';
import { localEnv } from '../../scripts/dev/local-env.ts';
import { localSync } from '../../scripts/dev/local-sync.ts';
import { SPRITE_SOURCE } from '../../src/domain/pokemon/sprite-source.ts';

export async function startBrowserOrigin() {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const api = await startAccountWorker({
    origin,
    sync: { ...localSync, endpoint: `${origin}/sync-data` },
    connectionString:
      'postgresql://postgres:unused@127.0.0.1:5548/quizmon_pilot',
    secret: localEnv.BETTER_AUTH_SECRET!,
  });
  const { httpServer } = await preview({
    configFile: false,
    logLevel: 'silent',
    build: { outDir: 'dist' },
    preview: {
      host: '127.0.0.1',
      port,
      strictPort: true,
      proxy: {
        '/api': { target: api.base },
        '/sync-data': {
          target: localSync.endpoint,
          rewrite: (path) => path.replace(/^\/sync-data/, ''),
        },
        '/sprites': { target: SPRITE_SOURCE, changeOrigin: true },
      },
    },
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
      await api.close();
    },
  };
}

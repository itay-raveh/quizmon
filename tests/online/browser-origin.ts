import { freePort, startAccountWorker } from './account-fixture.ts';
import { createServer } from 'node:http';
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
  // Local PowerSync reads JWKS from the fixed Docker host port.
  const jwks = createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/api/auth/jwks') {
      response.writeHead(404).end();
      return;
    }
    void (async () => {
      try {
        const upstream = await fetch(`${api.base}/api/auth/jwks`);
        response.writeHead(upstream.status, {
          'content-type':
            upstream.headers.get('content-type') ?? 'application/json',
        });
        response.end(await upstream.text());
      } catch {
        response.writeHead(502).end();
      }
    })();
  });
  await new Promise<void>((resolve, reject) => {
    jwks.once('error', reject);
    jwks.listen(8790, '0.0.0.0', resolve);
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
      await new Promise<void>((resolve) => jwks.close(() => resolve()));
      await api.close();
    },
  };
}

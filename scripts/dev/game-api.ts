import { localSync } from './local-sync.ts';
import { createAccountApi } from '../../server/api.ts';

import { localEnv } from './local-env.ts';

import { serve } from '@hono/node-server';

const app = createAccountApi({
  sync: localSync,
  connectionString: 'postgresql://postgres:unused@127.0.0.1:5548/quizmon_pilot',
  origin: process.env.QUIZMON_GAME_ORIGIN ?? 'http://127.0.0.1:5173',
  secret: localEnv.BETTER_AUTH_SECRET!,
  mail: { mode: 'test-mailbox' },
});
const server = serve({ fetch: app.fetch, hostname: '0.0.0.0', port: 8790 });
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close());
console.log(
  'Local game API ready. Sign-in codes go to the local test mailbox.',
);

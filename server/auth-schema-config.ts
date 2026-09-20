import { authPlugins } from './auth-options.ts';

import { betterAuth } from 'better-auth';

import { drizzle } from 'drizzle-orm/node-postgres';

import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export const auth = betterAuth({
  database: drizzleAdapter(drizzle('postgresql://localhost/unused'), {
    provider: 'pg',
  }),
  plugins: authPlugins(async () => {}, 'quizmon-pilot'),
  telemetry: { enabled: false },
});

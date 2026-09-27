import { accountRuntime } from './account-config.ts';
import { exportAccount } from './account-export.ts';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Hono, type Context } from 'hono';
import * as Sentry from '@sentry/cloudflare';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { matchedRoutes } from 'hono/route';
import { Client } from 'pg';
import { isRecord } from '../src/lib/validation.ts';
import type { SyncConnection } from '../src/domain/sync/connection.ts';
import { authPlugins } from './auth-options.ts';
import { FriendshipError } from './friends.ts';
import { friendshipApi } from './friends-api.ts';
import { leaderboardApi } from './leaderboards-api.ts';
import { trainerApi } from './trainers-api.ts';
import { bootstrapSocialIdentity } from './friend-identity.ts';
import { reserveEmail } from './email-budget.ts';
import {
  EmailDeliveryError,
  codeLifetimeSeconds,
  type AccountMail,
} from './email.ts';
import * as schema from './schema.ts';

const testMailbox = new Map<string, { code: string; createdAt: number }>();

export interface AccountServices {
  sync: SyncConnection;
  connectionString: string;
  secret: string;
  origin: string;
  mail: AccountMail;
}

const createAuth = (db: NodePgDatabase, services: AccountServices) => {
  let deliveryError: EmailDeliveryError | undefined;
  const auth = betterAuth({
    baseURL: services.origin,
    secret: services.secret,
    database: drizzleAdapter(db, { provider: 'pg', schema, transaction: true }),
    trustedOrigins: [services.origin],
    telemetry: { enabled: false },
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (_user, request) => {
          if (!request) throw new APIError('BAD_REQUEST');
          const { token } = await auth.api.getToken({
            headers: request.headers,
          });
          const response = await fetch(
            `${services.sync.endpoint}/read/account`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
                Origin: services.origin,
              },
            },
          );
          if (!response.ok)
            throw new APIError('SERVICE_UNAVAILABLE', {
              message: 'Account progress could not be deleted. Try again.',
            });
        },
      },
    },
    hooks: {
      before: createAuthMiddleware((context) => {
        if (context.path !== '/email-otp/send-verification-otp')
          return Promise.resolve();
        const body: unknown = context.body;
        if (!isRecord(body) || body.type !== 'sign-in') {
          throw new APIError('BAD_REQUEST', {
            message: 'Request a sign-in code.',
          });
        }
        const email = body.email;
        if (
          services.mail.mode === 'test-mailbox' &&
          (typeof email !== 'string' ||
            !email.toLowerCase().endsWith('@example.test'))
        ) {
          throw new APIError('BAD_REQUEST', {
            message: 'Use an @example.test address for local development.',
          });
        }
        return Promise.resolve();
      }),
      after: createAuthMiddleware(() => {
        // Better Auth 1.7.4 catches delivery callback errors before this hook.
        // https://github.com/better-auth/better-auth/issues/9183
        if (deliveryError) {
          throw new APIError(
            deliveryError.limited ? 'TOO_MANY_REQUESTS' : 'SERVICE_UNAVAILABLE',
            { code: 'EMAIL_DELIVERY_FAILED', message: deliveryError.message },
          );
        }
        return Promise.resolve();
      }),
    },
    plugins: authPlugins(async (email, code) => {
      try {
        if (services.mail.mode === 'cloudflare') {
          await reserveEmail(db);
          await services.mail.deliver(email, code);
        } else {
          testMailbox.set(email.toLowerCase(), { code, createdAt: Date.now() });
        }
      } catch (error) {
        deliveryError =
          error instanceof EmailDeliveryError
            ? error
            : new EmailDeliveryError();
      }
    }, services.sync.audience),
  });
  return auth;
};

export interface AccountEnv {
  Variables: {
    db: NodePgDatabase;
    auth: ReturnType<typeof createAuth>;
    accountId: string;
    origin: string;
    sync: SyncConnection;
  };
}

export function createAccountApi(services: AccountServices) {
  const runtime = accountRuntime(services);
  const { sync } = runtime;
  const app = new Hono<AccountEnv>();
  app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }));
  app.use('*', async (context, next) => {
    if (!runtime.accepts(context.req.url))
      return context.text('Account service unavailable on this origin.', 403);
    context.header('Cache-Control', 'no-store');
    await next();
  });
  app.onError((error, context) => {
    if (error instanceof FriendshipError)
      return context.json({ error: error.code }, error.status);
    if (error instanceof HTTPException) {
      context.header('Cache-Control', 'no-store');
      const response = error.getResponse();
      return context.newResponse(response.body, {
        status: error.status,
        headers: response.headers,
      });
    }
    console.error(error);
    try {
      Sentry.captureException(error, {
        tags: { 'error.kind': 'account.api' },
      });
    } catch {
      // Monitoring must not change account responses.
    }
    return context.text('Internal Server Error', 500);
  });
  app.get('/api/account/config', (context) =>
    context.json({ emailDelivery: services.mail.mode }),
  );
  app.use('/api/*', async (context: Context<AccountEnv>, next) => {
    if (
      !matchedRoutes(context).some(
        ({ method, path }) => method !== 'ALL' || path === '/api/auth/*',
      )
    )
      return context.notFound();
    const client = new Client({ connectionString: services.connectionString });
    await client.connect();
    try {
      const db = drizzle(client);
      context.set('db', db);
      context.set('auth', createAuth(db, services));
      context.set('origin', services.origin);
      context.set('sync', sync);
      await next();
    } finally {
      await client.end();
    }
  });
  app.all('/api/auth/*', (context) =>
    context.get('auth').handler(context.req.raw),
  );
  if (services.mail.mode === 'test-mailbox')
    app.get('/api/dev/mailbox', (context) => {
      const email = (context.req.query('email') ?? '').toLowerCase();
      const mail = testMailbox.get(email);
      return context.json({
        code:
          mail && Date.now() - mail.createdAt < codeLifetimeSeconds * 1000
            ? mail.code
            : null,
      });
    });
  const signedIn = new Hono<AccountEnv>();
  signedIn.use('*', async (context, next) => {
    const session = await context
      .get('auth')
      .api.getSession({ headers: context.req.raw.headers });
    if (!session)
      return context.json({ error: 'Sign in to continue syncing.' }, 401);
    context.set('accountId', session.user.id);
    try {
      Sentry.setUser({ id: session.user.id, email: session.user.email });
    } catch {
      // Monitoring cannot interrupt authenticated requests.
    }
    await next();
  });
  signedIn.get('/me', (context) =>
    context.json({ id: context.get('accountId') }),
  );
  signedIn.get('/account/export', (context) => exportAccount(context));
  signedIn.route('/friends', friendshipApi);
  signedIn.route('/leaderboards', leaderboardApi);
  signedIn.route('/trainers', trainerApi);
  signedIn.get('/account', async (context) => {
    await bootstrapSocialIdentity(context);
    return context.json({
      id: context.get('accountId'),
      sync,
    });
  });
  app.route('/api', signedIn);
  return app;
}

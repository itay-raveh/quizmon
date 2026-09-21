import { accountRuntime } from './account-config.ts';
import { exportAccount } from './account-export.ts';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Hono, type Context } from 'hono';
import * as Sentry from '@sentry/cloudflare';
import { bodyLimit } from 'hono/body-limit';
import { matchedRoutes } from 'hono/route';
import { Client } from 'pg';
import { isDailyDate } from '../src/lib/validation.ts';
import type { SyncConnection } from '../src/domain/sync/connection.ts';
import { isRecord } from '../src/lib/validation.ts';
import { uuid, validActionEnvelope } from '../src/domain/sync/progress.ts';
import { authPlugins } from './auth-options.ts';
import { FriendshipError } from './friends.ts';
import { friendshipApi } from './friends-api.ts';
import { leaderboardApi } from './leaderboards-api.ts';
import { reserveEmail } from './email-budget.ts';
import {
  EmailDeliveryError,
  codeLifetimeSeconds,
  type AccountMail,
} from './email.ts';
import {
  ProgressError,
  applyAction,
  bootstrap,
  linkDataset,
} from './progress-api.ts';
import * as schema from './schema.ts';

export interface AccountServices {
  sync: SyncConnection;
  connectionString: string;
  secret: string;
  origin: string;
  mail: AccountMail;
  emailBudgetId?: string;
}

const createAuth = (db: NodePgDatabase, services: AccountServices) => {
  let deliveryError: EmailDeliveryError | undefined;
  return betterAuth({
    baseURL: services.origin,
    secret: services.secret,
    database: drizzleAdapter(db, { provider: 'pg', schema, transaction: true }),
    trustedOrigins: [services.origin],
    telemetry: { enabled: false },
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
          await reserveEmail(db, services.emailBudgetId);
          await services.mail.deliver(email, code);
        } else {
          await db
            .insert(schema.testMailbox)
            .values({ email, code })
            .onConflictDoUpdate({
              target: schema.testMailbox.email,
              set: { code, createdAt: new Date() },
            });
        }
      } catch (error) {
        deliveryError =
          error instanceof EmailDeliveryError
            ? error
            : new EmailDeliveryError();
      }
    }, services.sync.audience),
  });
};

export interface AccountEnv {
  Variables: {
    db: NodePgDatabase;
    auth: ReturnType<typeof createAuth>;
    accountId: string;
    origin: string;
    state: Awaited<ReturnType<typeof bootstrap>>;
    body: Record<string, unknown>;
  };
}

export function createAccountApi(services: AccountServices) {
  const runtime = accountRuntime(services);
  const { sync } = runtime;
  const app = new Hono<AccountEnv>();
  app.use('*', bodyLimit({ maxSize: 12 * 1024 * 1024 }));
  for (const path of [
    '/api/auth/*',
    '/api/sync/*',
    '/api/account/link',
    '/api/dev/*',
    '/api/friends/*',
  ])
    app.use(path, bodyLimit({ maxSize: 1024 * 1024 }));
  app.use('*', async (context, next) => {
    if (!runtime.accepts(context.req.url))
      return context.text('Account service unavailable on this origin.', 403);
    context.header('Cache-Control', 'no-store');
    await next();
  });
  app.onError((error, context) => {
    if (error instanceof ProgressError || error instanceof FriendshipError)
      return context.json({ error: error.code }, error.status);
    console.error(error);
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
      await next();
    } finally {
      await client.end();
    }
  });
  app.all('/api/auth/*', (context) =>
    context.get('auth').handler(context.req.raw),
  );
  if (services.mail.mode === 'test-mailbox')
    app.get('/api/dev/mailbox', async (context) => {
      const email = (context.req.query('email') ?? '').toLowerCase();
      const [mail] = await context
        .get('db')
        .select()
        .from(schema.testMailbox)
        .where(eq(schema.testMailbox.email, email));
      return context.json({
        code:
          mail &&
          Date.now() - mail.createdAt.getTime() < codeLifetimeSeconds * 1000
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
  signedIn.get('/account/export', (context) =>
    exportAccount(
      services.connectionString,
      context.get('accountId'),
      context.req.raw.signal,
    ),
  );
  signedIn.route('/friends', friendshipApi);
  signedIn.route('/leaderboards', leaderboardApi);
  signedIn.get('/account', async (context) => {
    const state = await bootstrap(context.get('db'), context.get('accountId'));
    return context.json({
      id: context.get('accountId'),
      generationId: state.account.generationId,
      serverEpoch: state.serverEpoch,
      versions: state.versions,
      sync,
    });
  });
  for (const path of ['/account/link', '/sync/operations'])
    signedIn.post(path, async (context, next) => {
      const state = await bootstrap(
        context.get('db'),
        context.get('accountId'),
      );
      if (context.req.header('Origin') !== services.origin)
        return context.text('Invalid origin.', 403);
      let body: unknown;
      try {
        body = await context.req.json();
      } catch {
        return context.json({ error: 'invalid_json' }, 400);
      }
      if (
        !isRecord(body) ||
        body.expectedAccountId !== context.get('accountId')
      )
        return context.json({ error: 'account_changed' }, 403);
      if (body.serverEpoch !== state.serverEpoch)
        return context.json({ error: 'server_epoch_changed' }, 409);
      context.set('state', state);
      context.set('body', body);
      await next();
    });
  signedIn.post('/account/link', async (context) => {
    const body = context.get('body');
    if (
      !uuid(body.datasetId) ||
      !uuid(body.linkId) ||
      !uuid(body.generationId) ||
      typeof body.merge !== 'boolean'
    )
      return context.json({ error: 'invalid_link' }, 400);
    return context.json(
      await linkDataset(
        context.get('db'),
        context.get('accountId'),
        body.datasetId,
        body.linkId,
        body.generationId,
        body.merge,
        context.get('state').serverEpoch,
        isDailyDate(body.profileCreatedAt) ? body.profileCreatedAt : undefined,
      ),
    );
  });
  signedIn.post('/sync/operations', async (context) => {
    const body = context.get('body');
    if (
      !Array.isArray(body.actions) ||
      !body.actions.length ||
      body.actions.length > 100 ||
      !body.actions.every(validActionEnvelope)
    )
      return context.json({ error: 'invalid_actions' }, 400);
    const outcomes = [];
    for (const action of body.actions)
      outcomes.push(
        await applyAction(
          context.get('db'),
          context.get('accountId'),
          context.get('state').serverEpoch,
          action,
        ),
      );
    return context.json({ outcomes });
  });
  app.route('/api', signedIn);
  return app;
}

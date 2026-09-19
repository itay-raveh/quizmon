import { accountRuntime } from './account-config.ts';
import { exportAccount } from './account-export.ts';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { Client } from 'pg';
import { isDailyDate } from '../src/lib/validation.ts';
import type { SyncConnection } from '../src/domain/sync/connection.ts';
import { isRecord } from '../src/lib/validation.ts';
import { uuid, validActionEnvelope } from '../src/domain/sync/progress.ts';
import { authPlugins } from './auth-options.ts';
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

export function createAccountApi(services: AccountServices) {
  const runtime = accountRuntime(services);
  const { sync } = runtime;
  const app = new Hono();
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
    if (!runtime.accepts(context.req.url)) {
      return context.text('Account service unavailable on this origin.', 403);
    }
    context.header('Cache-Control', 'no-store');
    await next();
  });
  app.get('/api/account/config', (context) =>
    context.json({ emailDelivery: services.mail.mode }),
  );
  app.all('/api/*', async (context) => {
    const path = context.req.path;
    if (
      ![
        '/api/auth/',
        '/api/account/',
        '/api/friends/',
        '/api/leaderboards/',
      ].some((prefix) => path.startsWith(prefix)) &&
      ![
        '/api/account',
        '/api/friends',
        '/api/me',
        '/api/sync/operations',
        '/api/dev/mailbox',
      ].includes(path)
    )
      return context.notFound();
    if (
      context.req.path === '/api/dev/mailbox' &&
      services.mail.mode !== 'test-mailbox'
    )
      return context.notFound();
    const client = new Client({ connectionString: services.connectionString });
    await client.connect();
    try {
      const db = drizzle(client);
      const auth = createAuth(db, services);
      if (context.req.path.startsWith('/api/auth/'))
        return await auth.handler(context.req.raw);
      if (
        context.req.path === '/api/dev/mailbox' &&
        context.req.method === 'GET'
      ) {
        const email = (context.req.query('email') ?? '').toLowerCase();
        const [mail] = await db
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
      }
      const session = await auth.api.getSession({
        headers: context.req.raw.headers,
      });
      if (!session)
        return context.json({ error: 'Sign in to continue syncing.' }, 401);
      if (
        context.req.path === '/api/account/export' &&
        context.req.method === 'GET'
      )
        return await exportAccount(
          services.connectionString,
          session.user.id,
          context.req.raw.signal,
        );
      if (context.req.path.startsWith('/api/leaderboards/'))
        return await leaderboardApi.fetch(context.req.raw, {
          db,
          accountId: session.user.id,
        });
      if (
        context.req.path === '/api/friends' ||
        context.req.path.startsWith('/api/friends/')
      )
        return await friendshipApi.fetch(context.req.raw, {
          db,
          accountId: session.user.id,
          origin: services.origin,
        });
      if (context.req.path === '/api/me' && context.req.method === 'GET') {
        return context.json({ id: session.user.id });
      }
      if (
        context.req.path.startsWith('/api/account') ||
        context.req.path === '/api/sync/operations'
      ) {
        try {
          const state = await bootstrap(db, session.user.id);
          if (
            context.req.path === '/api/account' &&
            context.req.method === 'GET'
          ) {
            return context.json({
              id: session.user.id,
              generationId: state.account.generationId,
              serverEpoch: state.serverEpoch,
              versions: state.versions,
              sync,
            });
          }
          if (context.req.method !== 'POST') return context.notFound();
          if (context.req.header('Origin') !== services.origin)
            return context.text('Invalid origin.', 403);
          let body: unknown;
          try {
            body = await context.req.json();
          } catch {
            return context.json({ error: 'invalid_json' }, 400);
          }
          if (!isRecord(body) || body.expectedAccountId !== session.user.id)
            return context.json({ error: 'account_changed' }, 403);
          if (body.serverEpoch !== state.serverEpoch)
            return context.json({ error: 'server_epoch_changed' }, 409);
          if (context.req.path === '/api/account/link') {
            if (
              !uuid(body.datasetId) ||
              !uuid(body.linkId) ||
              !uuid(body.generationId) ||
              typeof body.merge !== 'boolean'
            )
              return context.json({ error: 'invalid_link' }, 400);
            return context.json(
              await linkDataset(
                db,
                session.user.id,
                body.datasetId,
                body.linkId,
                body.generationId,
                body.merge,
                state.serverEpoch,
                isDailyDate(body.profileCreatedAt)
                  ? body.profileCreatedAt
                  : undefined,
              ),
            );
          }
          if (context.req.path !== '/api/sync/operations')
            return context.notFound();
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
              await applyAction(db, session.user.id, state.serverEpoch, action),
            );
          return context.json({ outcomes });
        } catch (error) {
          if (error instanceof ProgressError)
            return context.json({ error: error.code }, error.status);
          throw error;
        }
      }
      return context.notFound();
    } finally {
      await client.end();
    }
  });
  return app;
}

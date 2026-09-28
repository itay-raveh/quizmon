import game, { DailyReminder as DailyReminderClass } from './game.ts';
import accounts from '../server/worker.ts';
import * as Sentry from '@sentry/cloudflare';
import { filterWorkerDatabaseSpan } from '../server/sentry-spans.ts';
import type { DailyReminderEnv } from './daily-reminder.ts';

type GameAccountEnv = Partial<AccountEnv> &
  Parameters<typeof game.fetch>[1] & {
    SENTRY_DSN?: string;
    SENTRY_RELEASE?: string;
    MAINTENANCE_MODE?: string;
  };

const dataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
} satisfies NonNullable<Sentry.CloudflareOptions['dataCollection']>;

export const handler = {
  async fetch(request: Request, env: GameAccountEnv): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (env.MAINTENANCE_MODE === 'on') {
      const headers = {
        'Cache-Control': 'no-store',
        'Retry-After': '300',
        'X-Quizmon-Maintenance': '1',
      };
      if (path.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method))
        return new Response('Quizmon is under maintenance.', {
          status: 503,
          headers,
        });

      const page = await env.ASSETS.fetch(
        new Request(new URL('/maintenance.html', request.url)),
      );
      return new Response(request.method === 'HEAD' ? null : page.body, {
        status: 503,
        headers: {
          ...headers,
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }
    if (path.startsWith('/api/') && !path.startsWith('/api/daily-reminders/'))
      return accounts.fetch(request, env);
    return game.fetch(request, env);
  },
};

export default Sentry.withSentry(
  (env) =>
    env.SENTRY_DSN
      ? {
          dsn: env.SENTRY_DSN,
          release: env.SENTRY_RELEASE,
          tracesSampleRate: 0.1,
          dataCollection,
          beforeSend(event) {
            delete event.request;
            delete event.extra;
            delete event.message;
            event.breadcrumbs = [];
            for (const exception of event.exception?.values ?? [])
              exception.value = exception.type ?? 'Unexpected error';
            return event;
          },
          beforeSendSpan: filterWorkerDatabaseSpan,
        }
      : undefined,
  handler,
);

export const DailyReminder = Sentry.instrumentDurableObjectWithSentry(
  (env: DailyReminderEnv & { SENTRY_DSN?: string; SENTRY_RELEASE?: string }) =>
    env.SENTRY_DSN
      ? { dsn: env.SENTRY_DSN, release: env.SENTRY_RELEASE, dataCollection }
      : {},
  DailyReminderClass,
);

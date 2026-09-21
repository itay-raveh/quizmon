import game, { DailyReminder as DailyReminderClass } from './game.ts';
import accounts from '../server/worker.ts';
import * as Sentry from '@sentry/cloudflare';
import type { DailyReminderEnv } from './daily-reminder.ts';

type GameAccountEnv = Partial<AccountEnv> &
  Parameters<typeof game.fetch>[1] & {
    SENTRY_DSN?: string;
    SENTRY_RELEASE?: string;
  };

const handler = {
  fetch(request: Request, env: GameAccountEnv): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/') && !path.startsWith('/api/daily-reminders/'))
      return accounts.fetch(request, env);
    return game.fetch(request, env);
  },
};

export default Sentry.withSentry<GameAccountEnv>(
  (env) =>
    env.SENTRY_DSN
      ? {
          dsn: env.SENTRY_DSN,
          release: env.SENTRY_RELEASE,
          tracesSampleRate: 0.1,
          enableLogs: true,
          sendDefaultPii: false,
          beforeSend(event) {
            delete event.request;
            delete event.extra;
            delete event.message;
            event.breadcrumbs = [];
            for (const exception of event.exception?.values ?? [])
              exception.value = exception.type ?? 'Unexpected error';
            return event;
          },
          beforeSendLog(log) {
            return log.message === 'quizmon.failure' ? log : null;
          },
        }
      : undefined,
  handler,
);

export const DailyReminder = Sentry.instrumentDurableObjectWithSentry(
  (env: DailyReminderEnv & { SENTRY_DSN?: string; SENTRY_RELEASE?: string }) =>
    env.SENTRY_DSN ? { dsn: env.SENTRY_DSN, release: env.SENTRY_RELEASE } : {},
  DailyReminderClass,
);

import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN)
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.SENTRY_RELEASE,
    environment: 'production',
    tracesSampleRate: 0.1,
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
  });

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
    beforeSendSpan(span) {
      if (span.op?.startsWith('db')) {
        span.description = 'Database operation';
        for (const key of Object.keys(span.data))
          if (
            key.startsWith('db.') &&
            ![
              'db.system',
              'db.name',
              'db.operation',
              'db.mongodb.collection',
            ].includes(key)
          )
            delete span.data[key];
      }
      return span;
    },
  });

import * as Sentry from '@sentry/node';
import { isMainThread } from 'node:worker_threads';

if (isMainThread && process.env.SENTRY_DSN)
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.SENTRY_RELEASE,
    environment: 'production',
    tracesSampleRate: 0.1,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      databaseQueryData: true,
      queues: false,
      graphQL: { document: false, variables: false },
      stackFrameVariables: false,
    },
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

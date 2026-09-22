import * as Sentry from '@sentry/react';

const env = (import.meta.env ?? { PROD: false }) as {
  PROD: boolean;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_RELEASE?: string;
};
const dsn = env.PROD ? env.VITE_SENTRY_DSN : undefined;
let feedback: ReturnType<typeof Sentry.feedbackIntegration> | undefined;
let replayTransition = Promise.resolve();
let identityVersion = 0;

export const sentryEnabled = Boolean(dsn);

export const initSentry = () => {
  if (!dsn) return;
  try {
    feedback = Sentry.feedbackIntegration({
      autoInject: false,
      enableScreenshot: true,
      isEmailRequired: false,
      isNameRequired: false,
    });
    Sentry.init({
      dsn,
      release: env.VITE_SENTRY_RELEASE,
      sendDefaultPii: false,
      enableLogs: true,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1,
      integrations: [
        Sentry.browserTracingIntegration({
          traceFetch: false,
          traceXHR: false,
        }),
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true,
        }),
        feedback,
      ],
      beforeBreadcrumb(breadcrumb) {
        return ['http', 'fetch', 'xhr', 'navigation', 'ui.input'].includes(
          breadcrumb.category ?? '',
        )
          ? null
          : breadcrumb;
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
      beforeSendLog(log) {
        return log.message === 'quizmon.failure' ? log : null;
      },
    });
    Sentry.setUser(null);
  } catch {
    feedback = undefined;
  }
};

export const attachBugReport = (element: Element) => {
  try {
    return feedback?.attachTo(element);
  } catch {
    return undefined;
  }
};

export const clearSentryUser = () => {
  const version = ++identityVersion;
  try {
    Sentry.setUser(null);
  } catch {
    // Local sign-out must continue if monitoring fails.
  }
  replayTransition = replayTransition.then(async () => {
    try {
      const replay = Sentry.getReplay();
      await replay?.stop({ flush: false });
      replay?.startBuffering();
    } catch {
      // Identity changes cannot interrupt account actions.
    }
  });
  return version;
};

export const setVerifiedSentryUser = async (
  id: string,
  email: string,
  version: number,
) => {
  await replayTransition;
  if (version === identityVersion)
    try {
      Sentry.setUser({ id, email });
    } catch {
      // Identity changes cannot interrupt account actions.
    }
};

export const captureUnexpectedError = (kind: string, error: unknown) => {
  if (!dsn) return;
  try {
    Sentry.captureException(error, { tags: { 'error.kind': kind } });
  } catch {
    // Telemetry cannot interrupt gameplay.
  }
};

export { Sentry };

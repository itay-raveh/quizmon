import * as Sentry from '@sentry/react';

const env = (import.meta.env ?? { PROD: false }) as {
  PROD: boolean;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_RELEASE?: string;
};
const dsn = env.PROD ? env.VITE_SENTRY_DSN : undefined;
let feedback: ReturnType<typeof Sentry.feedbackIntegration> | undefined;
let identityVersion = 0;

export const feedbackLabel = 'Send feedback';
export const sentryEnabled = Boolean(dsn);

export const initSentry = () => {
  if (!dsn) return;
  try {
    feedback = Sentry.feedbackIntegration({
      autoInject: false,
      enableScreenshot: true,
      emailLabel: 'Email (optional)',
      formTitle: feedbackLabel,
      isEmailRequired: false,
      isNameRequired: false,
      messageLabel: 'Your feedback',
      messagePlaceholder:
        'Report a problem, share an idea, or leave a comment.',
      showName: false,
      submitButtonLabel: feedbackLabel,
      successMessageText: 'Thanks for your feedback.',
    });
    Sentry.init({
      dsn,
      release: env.VITE_SENTRY_RELEASE,
      sendDefaultPii: false,
      enableLogs: true,
      tracesSampleRate: 0.1,
      tracePropagationTargets: [
        /^\/api\//,
        /^https:\/\/quizmon\.raveh\.dev\/api\//,
        /^https:\/\/quizmon-sync\.raveh\.dev\//,
      ],
      integrations: [
        Sentry.browserTracingIntegration({
          traceFetch: true,
          traceXHR: false,
          shouldCreateSpanForRequest: (url) =>
            url.startsWith('/api/') ||
            url.startsWith('https://quizmon.raveh.dev/api/') ||
            url.startsWith('https://quizmon-sync.raveh.dev/'),
        }),
        feedback,
      ],
      beforeSendLog(log) {
        return log.message === 'quizmon.failure' ? log : null;
      },
      beforeSendMetric(metric) {
        delete metric.attributes?.['user.id'];
        delete metric.attributes?.['user.email'];
        delete metric.attributes?.['user.name'];
        return metric;
      },
    });
    Sentry.setUser(null);
  } catch {
    feedback = undefined;
  }
};

export const attachFeedback = (
  element: Element,
  callbacks?: {
    onFormOpen?: () => void;
    onFormClose?: () => void;
    onFormSubmitted?: () => void;
  },
) => {
  try {
    return feedback?.attachTo(element, callbacks);
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
  return version;
};

export const setVerifiedSentryUser = (
  id: string,
  email: string,
  version: number,
) => {
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

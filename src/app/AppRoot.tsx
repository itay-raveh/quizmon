import { lazy, Suspense } from 'react';
import { SaveRecoveryBoundary } from '../features/settings/SaveRecovery';
import { getSaveIssue } from '../lib/storage/save-health';
import { Sentry } from '../lib/sentry';

const LocalGame = lazy(() =>
  import('./LocalGame').then(({ LocalGame }) => ({ default: LocalGame })),
);

export const AppRoot = () => (
  <SaveRecoveryBoundary>
    <Sentry.ErrorBoundary
      fallback={
        <p role="alert">
          Quizmon could not display this screen. <a href="/">Reload Quizmon</a>.
        </p>
      }
    >
      {getSaveIssue() ? null : (
        <Suspense fallback={null}>
          <LocalGame />
        </Suspense>
      )}
    </Sentry.ErrorBoundary>
  </SaveRecoveryBoundary>
);

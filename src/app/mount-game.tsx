import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { getUtcDate } from '../domain/quiz/daily';
import { Footer } from './Footer';
import { captureUnexpectedError } from '../lib/sentry';
import { HomeScreen } from './HomeScreen';
import { queryClient } from '../lib/query-client';
import { router } from './router';
import { AppNavigationLoading } from './AppNavigation';

export const mountGame = (root: HTMLElement) => {
  const app = createRoot(root);
  app.render(
    <StrictMode>
      <div className="app app--landing app--with-navigation" aria-busy="true">
        <div className="background" aria-hidden="true" />
        <div className="app__screen">
          <AppNavigationLoading />
          <main>
            <HomeScreen
              catalogStatus="loading"
              dailyDate={getUtcDate()}
              dailyResult={null}
              dailyResultSaved={true}
              dailyForfeited={false}
              dailyStreak={0}
              level={1}
              badges={[]}
              onCustomizeTraining={() => {}}
              onRetryCatalog={() => {}}
              onStart={() => {}}
              onStartDaily={() => {}}
              onStartLeague={() => {}}
              storageAvailable={true}
            />
          </main>
          <Footer />
        </div>
      </div>
    </StrictMode>,
  );
  const game = Promise.all([
    import('./LocalGame'),
    import('../lib/storage/save-recovery'),
  ]);
  return async () => {
    try {
      const [, { inspectSavedData }] = await game;
      inspectSavedData();
      app.render(
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </StrictMode>,
      );
    } catch (error) {
      captureUnexpectedError('app.mount', error);
      app.render(
        <p role="alert">
          Quizmon could not be loaded. Please reload to try again.
        </p>,
      );
    }
  };
};

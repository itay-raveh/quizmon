import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { getUtcDate } from '../domain/quiz/daily';
import { AppNavigation } from './AppNavigation';
import { Footer } from './Footer';
import { Sentry, captureUnexpectedError } from '../lib/sentry';
import { HomeScreen } from './HomeScreen';

export const mountGame = (root: HTMLElement) => {
  const app = createRoot(root);
  app.render(
    <StrictMode>
      <BrowserRouter>
        <div className="app app--landing app--with-navigation" aria-busy="true">
          <div className="background" aria-hidden="true" />
          <div className="app__screen">
            <AppNavigation
              active="play"
              accountOpen={false}
              loading
              onSettings={() => {}}
              trainerAvailable={false}
              onNavigate={() => {}}
            />
            <main>
              <HomeScreen
                catalogStatus="loading"
                dailyDate={getUtcDate()}
                dailyResult={null}
                dailyResultSaved={true}
                dailyStreak={0}
                leagueUnlocked={false}
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
      </BrowserRouter>
    </StrictMode>,
  );
  const game = Promise.all([
    import('../features/settings/SaveRecovery'),
    import('../lib/storage/save-health'),
    import('./LocalGame'),
  ]);
  return async () => {
    try {
      const [{ SaveRecoveryBoundary }, { getSaveIssue }, { LocalGame }] =
        await game;
      app.render(
        <StrictMode>
          <BrowserRouter>
            <SaveRecoveryBoundary>
              <Sentry.ErrorBoundary
                fallback={
                  <p role="alert">
                    Quizmon could not display this screen.{' '}
                    <a href="/">Reload Quizmon</a>.
                  </p>
                }
              >
                {getSaveIssue() ? null : <LocalGame />}
              </Sentry.ErrorBoundary>
            </SaveRecoveryBoundary>
          </BrowserRouter>
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

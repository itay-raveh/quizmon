import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { getUtcDate } from '../domain/quiz/daily';
import { AppNavigation } from './AppNavigation';
import { Footer } from './Footer';
import { HomeScreen } from './HomeScreen';

export const mountGame = (root: HTMLElement) => {
  const app = createRoot(root);
  app.render(
    <StrictMode>
      <div className="app app--landing app--with-navigation" aria-busy="true">
        <div className="background" aria-hidden="true" />
        <div className="app__screen">
          <div inert>
            <AppNavigation
              active="play"
              accountOpen={false}
              onAccount={() => {}}
              onSettings={() => {}}
              trainerAvailable={false}
              onNavigate={() => {}}
            />
          </div>
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
          <SaveRecoveryBoundary>
            {getSaveIssue() ? null : <LocalGame />}
          </SaveRecoveryBoundary>
        </StrictMode>,
      );
    } catch {
      app.render(
        <p role="alert">
          Quizmon could not be loaded. Please reload to try again.
        </p>,
      );
    }
  };
};

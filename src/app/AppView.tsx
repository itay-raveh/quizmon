import { Outlet, useLocation, useMatches } from '@tanstack/react-router';
import { useLayoutEffect, useRef } from 'react';
import { InstallProvider } from '../features/installation/InstallProvider';
import { LeaveGameDialog } from '../features/quiz/LeaveGameDialog';
import { DailyReminderProvider } from '../features/reminders/DailyReminderProvider';
import { SettingsDialog } from '../features/settings/SettingsDialog';
import { SoundProvider } from '../lib/audio/SoundProvider';
import { MotionProvider } from './providers/MotionProvider';
import { AppNavigation } from './AppNavigation';
import { Footer } from './Footer';
import { site } from './site';
import { useAppGameContext } from './AppGameContext';

export const AppView = () => {
  const {
    catalogState,
    navigation,
    routeLeave,
    session,
    settings,
    settingsDialog,
  } = useAppGameContext();
  const location = useLocation();
  const match = useMatches({ select: (matches) => matches.at(-1) });
  const main = useRef<HTMLElement>(null);
  const leagueResults =
    location.pathname === '/league' &&
    new URLSearchParams(location.searchStr).get('view') === 'results';
  const screen = `${match?.id}:${session.phase}:${leagueResults}`;
  const previousScreen = useRef(screen);

  useLayoutEffect(() => {
    const title =
      session.phase === 'questions'
        ? 'Question'
        : session.phase === 'results' &&
            (location.pathname === '/' || leagueResults)
          ? 'Results'
          : match?.staticData.title;
    document.title = title ? `${title} | Quizmon` : site.title;
    if (match?.status !== 'success') return;
    if (session.phase === 'questions') {
      previousScreen.current = screen;
      return;
    }
    const heading = [
      ...(main.current?.querySelectorAll<HTMLElement>('h1') ?? []),
    ].find((candidate) => !candidate.closest('[hidden]'));
    if (previousScreen.current === screen) {
      if (heading && document.activeElement === document.body) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      return;
    }
    previousScreen.current = screen;
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [
    catalogState.status,
    leagueResults,
    location.pathname,
    match?.staticData.title,
    match?.status,
    screen,
    session.phase,
  ]);

  const showNavigation = session.phase !== 'questions';
  const accountOpen = location.pathname.startsWith('/account');
  const trainerOpen = location.pathname.startsWith('/trainer');
  const destinationOpen =
    accountOpen ||
    trainerOpen ||
    location.pathname === '/rankings' ||
    location.pathname.startsWith('/players/');
  const active = accountOpen
    ? null
    : location.pathname === '/rankings' ||
        location.pathname.startsWith('/players/')
      ? 'rankings'
      : trainerOpen
        ? 'trainer'
        : 'play';

  return (
    <MotionProvider>
      <SoundProvider
        prepareScoreCount={session.phase !== 'landing'}
        volume={settings.soundVolume}
      >
        <InstallProvider>
          <DailyReminderProvider>
            <div
              className={`app app--${trainerOpen && showNavigation ? 'trainer' : session.phase}${showNavigation ? ' app--with-navigation' : ''}${destinationOpen && showNavigation ? ' app--destination' : ''}`}
            >
              <div className="background" aria-hidden="true" />
              <div className="app__screen">
                {showNavigation && (
                  <AppNavigation
                    active={active}
                    accountOpen={accountOpen}
                    onSettings={settingsDialog.open}
                    rankingsDate={
                      session.phase === 'results' &&
                      session.mode.kind === 'daily'
                        ? session.mode.date
                        : undefined
                    }
                    trainerAvailable={catalogState.status === 'ready'}
                    onNavigate={(next) => {
                      if (next === 'play') void navigation.returnToLanding();
                    }}
                  />
                )}
                <main ref={main}>
                  <Outlet />
                </main>
                {showNavigation && <Footer />}
              </div>
              {settingsDialog.isOpen && catalogState.status === 'ready' && (
                <SettingsDialog
                  catalog={catalogState.catalog}
                  section={settingsDialog.section}
                  settings={settings}
                  onClose={settingsDialog.close}
                  onSave={settingsDialog.save}
                  trainingChangesApplyNextGame={session.phase !== 'landing'}
                />
              )}
              {(navigation.leaveConfirmationOpen || routeLeave.open) && (
                <LeaveGameDialog
                  daily={
                    session.phase === 'questions' &&
                    session.mode.kind === 'daily'
                  }
                  onCancel={
                    routeLeave.open ? routeLeave.cancel : navigation.cancelLeave
                  }
                  onConfirm={
                    routeLeave.open
                      ? routeLeave.confirm
                      : navigation.confirmLeave
                  }
                />
              )}
            </div>
          </DailyReminderProvider>
        </InstallProvider>
      </SoundProvider>
    </MotionProvider>
  );
};

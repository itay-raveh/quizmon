import {
  isLeagueUnlocked,
  trainerViewLabels,
} from '../domain/player/trainer-progression';
import { getUtcDate } from '../domain/quiz/daily';
import { isLeagueVictory } from '../domain/quiz/league';
import type { AnswerResult } from '../domain/quiz/types';
import type { GameSettings } from '../domain/settings/types';
import type { useDailyChallenge } from '../features/daily/useDailyChallenge';
import { InstallProvider } from '../features/installation/InstallProvider';
import { LeagueDestination } from '../features/league/LeagueDestination';
import type { useLeagueChallenge } from '../features/league/useLeagueChallenge';
import type { useLeagueDestination } from '../features/league/useLeagueDestination';
import { LeaveGameDialog } from '../features/quiz/LeaveGameDialog';
import { QuestionScreen } from '../features/quiz/QuestionScreen';
import { ResultsScreen } from '../features/quiz/ResultsScreen';
import type { useTrainingGame } from '../features/quiz/useTrainingGame';
import { DailyReminderProvider } from '../features/reminders/DailyReminderProvider';
import { SettingsDialog } from '../features/settings/SettingsDialog';
import type { useSettingsDialog } from '../features/settings/useSettingsDialog';
import { TrainerPassport } from '../features/trainer/TrainerPassport';
import type { useTrainerCard } from '../features/trainer/useTrainerCard';
import type { usePokemonCatalog } from '../hooks/usePokemonCatalog';
import { SoundProvider } from '../lib/audio/SoundProvider';
import { Footer } from './Footer';
import type { GameSession } from './game-session';
import { HomeScreen } from './HomeScreen';
import { MotionProvider } from './providers/MotionProvider';
import type { useGameNavigation } from './useGameNavigation';
import { AccountScreen } from '../features/account/AccountScreen';
import { FriendsScreen } from '../features/friends/FriendsScreen';
import { LeaderboardScreen } from '../features/friends/LeaderboardScreen';
import { PublicTrainerScreen } from '../features/friends/PublicTrainerScreen';
import { AppNavigation } from './AppNavigation';
import { useAppDestination } from './useAppDestination';
import { useLayoutEffect, useRef } from 'react';
import { Navigate, NavigationType, useNavigationType } from 'react-router';
import { site } from './site';
import { GameButton } from '../components/GameButton';
type CatalogState = ReturnType<typeof usePokemonCatalog>;
const CatalogRouteState = ({
  title,
  status,
  onRetry,
}: {
  title: string;
  status: 'loading' | 'error';
  onRetry: () => void;
}) => (
  <section className="catalog-route-state">
    <h1>{title}</h1>
    {status === 'loading' ? (
      <p role="status">Loading Pokémon data…</p>
    ) : (
      <>
        <p role="alert">Pokémon data could not be loaded.</p>
        <GameButton onClick={onRetry}>Try again</GameButton>
      </>
    )}
  </section>
);
interface QuestionView {
  assistance: (count: number) => void;
  answer: (answer: AnswerResult) => void | Promise<void>;
  elapsedMilliseconds: number;
  elapsedSeconds: number;
  pauseTimer: () => number;
  recordAnswer: (answer: AnswerResult) => void | Promise<void>;
}
interface AppViewProps {
  catalogState: CatalogState;
  daily: ReturnType<typeof useDailyChallenge>;
  league: ReturnType<typeof useLeagueDestination> &
    ReturnType<typeof useLeagueChallenge>;
  settings: GameSettings;
  navigation: ReturnType<typeof useGameNavigation>;
  question: QuestionView;
  session: GameSession;
  settingsDialog: ReturnType<typeof useSettingsDialog>;
  trainer: ReturnType<typeof useTrainerCard>;
  training: ReturnType<typeof useTrainingGame>;
}
type DestinationNavigation = ReturnType<typeof useAppDestination>;
const AppScreen = ({
  catalogState,
  daily,
  league,
  navigation,
  question,
  session,
  settingsDialog,
  trainer,
  training,
  destination,
  onViewPlayer,
}: AppViewProps & {
  destination: DestinationNavigation;
  onViewPlayer: (id: string) => void;
}) => {
  if (session.phase !== 'questions' && !destination.isKnownPath) {
    return (
      <section>
        <h1>Page not found</h1>
        <p>This Quizmon page does not exist.</p>
      </section>
    );
  }
  if (session.phase !== 'questions' && destination.destination === 'account') {
    return (
      <AccountScreen
        hasTrainerName={Boolean(trainer.profile.name.trim())}
        onEditCard={() => destination.trainer('front', true)}
      />
    );
  }
  if (session.phase !== 'questions' && destination.destination === 'friends') {
    return (
      <>
        <div hidden={Boolean(destination.playerId)}>
          <FriendsScreen
            key={destination.friendCode}
            onCloseInvitation={() => destination.open('friends')}
            onSignIn={() => destination.account()}
            onViewPlayer={onViewPlayer}
            initialInput={destination.friendCode}
          />
        </div>
        {destination.playerId && (
          <PublicTrainerScreen
            key={destination.playerId}
            playerId={destination.playerId}
            catalog={
              catalogState.status === 'ready' ? catalogState.catalog : undefined
            }
            catalogError={catalogState.status === 'error'}
            onBack={destination.closePlayer}
            onRetryCatalog={catalogState.retry}
            backLabel="Back to friends"
          />
        )}
      </>
    );
  }
  if (session.phase !== 'questions' && destination.destination === 'rankings') {
    return (
      <>
        <div hidden={Boolean(destination.playerId)}>
          <LeaderboardScreen
            catalog={
              catalogState.status === 'ready' ? catalogState.catalog : undefined
            }
            onAccount={() => destination.account()}
            onViewPlayer={onViewPlayer}
            initialDate={destination.standingsDate}
            initialScope={destination.standingsScope}
            initialMode={destination.standingsMode}
            onSelectionChange={destination.selectStandings}
          />
        </div>
        {destination.playerId && (
          <PublicTrainerScreen
            key={destination.playerId}
            playerId={destination.playerId}
            catalog={
              catalogState.status === 'ready' ? catalogState.catalog : undefined
            }
            catalogError={catalogState.status === 'error'}
            onBack={destination.closePlayer}
            onRetryCatalog={catalogState.retry}
            backLabel="Back to rankings"
          />
        )}
      </>
    );
  }
  if (session.phase !== 'questions' && trainer.isOpen) {
    if (catalogState.status !== 'ready')
      return (
        <CatalogRouteState
          title="Trainer"
          status={catalogState.status}
          onRetry={catalogState.retry}
        />
      );
    return (
      <TrainerPassport
        catalog={catalogState.catalog}
        onProfileChange={trainer.updateProfile}
        profile={trainer.profile}
        requestedView={trainer.view}
        stats={trainer.stats}
      />
    );
  }
  const leagueUnlocked =
    session.phase === 'landing' && isLeagueUnlocked(trainer.stats);
  const leagueVictory =
    session.phase === 'results' &&
    session.mode.kind === 'league' &&
    isLeagueVictory(session.result);
  if (session.phase === 'landing' && league.isOpen && !leagueUnlocked)
    return <Navigate to="/" replace />;
  if (
    (league.isOpen && leagueUnlocked) ||
    (leagueVictory && !league.showResults)
  ) {
    if (catalogState.status !== 'ready')
      return (
        <CatalogRouteState
          title="Quizmon League"
          status={catalogState.status}
          onRetry={catalogState.retry}
        />
      );
    return (
      <LeagueDestination
        catalog={catalogState.catalog}
        completed={trainer.stats.leagueCompleted || leagueVictory}
        celebrate={leagueVictory}
        onBack={() => {
          league.close();
          void navigation.returnToLanding();
        }}
        onStart={() => {
          void league.start();
        }}
        onViewResults={
          leagueVictory ? () => league.setShowResults(true) : undefined
        }
        view={
          trainer.stats.leagueCompleted || leagueVictory
            ? (league.view ?? 'hall')
            : 'challenge'
        }
        onViewChange={league.open}
        freshRecord={
          session.phase === 'results' ? session.leagueRecord : undefined
        }
        resultSaved={session.phase === 'results' ? session.resultSaved : true}
      />
    );
  }
  if (session.phase === 'landing') {
    return (
      <>
        {training.error ? <p role="alert">{training.error}</p> : null}
        <HomeScreen
          catalogStatus={catalogState.status}
          dailyDate={daily.date}
          dailyResult={daily.result}
          dailyResultSaved={daily.resultSaved}
          dailyError={daily.error}
          dailyStreak={daily.date === getUtcDate() ? daily.streak : 0}
          leagueUnlocked={leagueUnlocked}
          leagueCompleted={trainer.stats.leagueCompleted}
          onCustomizeTraining={settingsDialog.openTraining}
          onRetryCatalog={catalogState.retry}
          onStart={training.start}
          onStartDaily={() => {
            void daily.start();
          }}
          onStartLeague={() =>
            league.open(trainer.stats.leagueCompleted ? 'hall' : 'challenge')
          }
          storageAvailable={daily.storageAvailable}
        />
      </>
    );
  }
  if (session.phase === 'questions') {
    const currentQuestion = session.questions[session.questionIndex];
    return currentQuestion ? (
      <QuestionScreen
        typeRelations={catalogState.catalog?.typeRelations}
        answerFlow={session.settings.answerFlow}
        key={currentQuestion.id}
        questionStartedMilliseconds={session.answers
          .slice(0, session.questionIndex)
          .reduce((sum, answer) => sum + (answer.responseMilliseconds ?? 0), 0)}
        elapsedMilliseconds={question.elapsedMilliseconds}
        elapsedSeconds={question.elapsedSeconds}
        interactionPaused={
          settingsDialog.isOpen || navigation.leaveConfirmationOpen
        }
        mode={session.mode}
        nextQuestion={session.questions[session.questionIndex + 1]}
        number={session.questionIndex + 1}
        onAssistance={question.assistance}
        onAnswer={question.answer}
        onAnswerRecorded={question.recordAnswer}
        onFeedbackStart={question.pauseTimer}
        onNewGame={() => {
          void navigation.requestLeave();
        }}
        question={currentQuestion}
        timerDisplay={session.settings.timerDisplay}
        total={session.questions.length}
      />
    ) : null;
  }
  return (
    <ResultsScreen
      bestResult={session.bestResult}
      dailyStreak={
        session.mode.kind === 'daily' && session.mode.date === getUtcDate()
          ? daily.streak
          : 0
      }
      isNewBest={session.isNewBest}
      mode={session.mode}
      settings={session.settings}
      onNewGame={() => {
        void navigation.returnToLanding();
      }}
      onRetryLeague={() => {
        void league.start();
      }}
      onTrainAgain={training.trainAgain}
      onStartTraining={training.start}
      onCustomizeTraining={settingsDialog.openTraining}
      result={session.result}
      resultSaved={session.resultSaved}
      progressChanges={session.progressChanges}
    />
  );
};
const AppOverlays = ({
  catalogState,
  settings,
  navigation,
  session,
  settingsDialog,
}: Pick<
  AppViewProps,
  'catalogState' | 'settings' | 'navigation' | 'session' | 'settingsDialog'
>) => (
  <>
    {settingsDialog.isOpen && catalogState.status === 'ready' ? (
      <SettingsDialog
        catalog={catalogState.catalog}
        section={settingsDialog.section}
        settings={settings}
        onClose={settingsDialog.close}
        onSave={settingsDialog.save}
        trainingChangesApplyNextGame={session.phase !== 'landing'}
      />
    ) : null}
    {navigation.leaveConfirmationOpen ? (
      <LeaveGameDialog
        confirmLabel={
          navigation.dailyLinkConfirmation ? 'Play Daily' : undefined
        }
        resumable={
          session.phase === 'questions' &&
          session.mode.kind === 'daily' &&
          Boolean(session.mode.track)
        }
        onCancel={navigation.cancelLeave}
        onConfirm={() => void navigation.confirmLeave()}
      />
    ) : null}
  </>
);
export const AppView = (props: AppViewProps) => {
  const destination = useAppDestination();
  const navigationType = useNavigationType();
  const main = useRef<HTMLElement>(null);
  const profileTrigger = useRef<HTMLElement | null>(null);
  const sourceScroll = useRef(0);
  let screenKey: string = props.session.phase;
  if (props.session.phase === 'questions') screenKey = 'questions';
  else if (!destination.isKnownPath) screenKey = destination.pathname;
  else if (destination.playerId) screenKey = `player:${destination.playerId}`;
  else if (destination.pathname === '/trainer/edit') screenKey = 'trainer:edit';
  else if (destination.destination) screenKey = destination.destination;
  else if (props.trainer.isOpen) screenKey = `trainer:${props.trainer.view}`;
  else if (props.league.isOpen) screenKey = `league:${props.league.view}`;
  const previousScreen = useRef(screenKey);
  useLayoutEffect(() => {
    const heading = [
      ...(main.current?.querySelectorAll<HTMLElement>('h1') ?? []),
    ].find((candidate) => !candidate.closest('[hidden]'));
    const title = screenKey.startsWith('trainer:')
      ? trainerViewLabels[props.trainer.view]
      : screenKey.startsWith('player:')
        ? 'Trainer profile'
        : screenKey.startsWith('league:')
          ? 'Quizmon League'
          : ((
              {
                account: 'Account',
                friends: 'Friends',
                rankings: 'Rankings',
                questions: 'Question',
                results: 'Results',
                landing: '',
              } as Record<string, string>
            )[screenKey] ?? 'Page not found');
    document.title = title ? `${title} | Quizmon` : site.title;
    if (previousScreen.current === screenKey) {
      if (heading && document.activeElement === document.body) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      return;
    }
    const leavingProfile = previousScreen.current.startsWith('player:');
    if (screenKey.startsWith('player:') && !leavingProfile)
      sourceScroll.current = window.scrollY;
    previousScreen.current = screenKey;
    if (leavingProfile && !screenKey.startsWith('player:')) {
      if (profileTrigger.current?.isConnected)
        profileTrigger.current.focus({ preventScroll: true });
      else {
        const heading = [
          ...(main.current?.querySelectorAll<HTMLElement>('h1') ?? []),
        ].find((candidate) => !candidate.closest('[hidden]'));
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }
      window.scrollTo(0, sourceScroll.current);
      profileTrigger.current = null;
      return;
    }
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    if (navigationType !== NavigationType.Pop) window.scrollTo(0, 0);
  }, [navigationType, props.catalogState.status, screenKey]);
  const onViewPlayer = (id: string) => {
    profileTrigger.current = document.activeElement as HTMLElement;
    destination.viewPlayer(id);
  };
  const showNavigation = props.session.phase !== 'questions';
  const active =
    destination.destination === 'account'
      ? null
      : destination.destination === 'rankings' ||
          destination.destination === 'friends'
        ? 'social'
        : props.trainer.isOpen
          ? 'trainer'
          : 'play';
  return (
    <MotionProvider>
      <SoundProvider
        prepareScoreCount={props.session.phase !== 'landing'}
        volume={props.settings.soundVolume}
      >
        <InstallProvider>
          <DailyReminderProvider>
            <div
              className={`app app--${props.trainer.isOpen && showNavigation ? 'trainer' : props.session.phase}${showNavigation ? ' app--with-navigation' : ''}${destination.destination && showNavigation ? ' app--destination' : ''}`}
            >
              <div className="background" aria-hidden="true" />
              <div className="app__screen">
                <AppNavigation
                  active={active}
                  accountOpen={destination.destination === 'account'}
                  onSettings={props.settingsDialog.open}
                  socialPath={
                    props.session.phase === 'results' &&
                    props.session.mode.kind === 'daily'
                      ? `/social/rankings?date=${props.session.mode.date}`
                      : undefined
                  }
                  showNavigation={showNavigation}
                  trainerAvailable={props.catalogState.status === 'ready'}
                  onNavigate={(next) => {
                    if (next === 'play') {
                      props.league.setShowResults(false);
                      void props.navigation.returnToLanding();
                    }
                  }}
                />
                <main ref={main}>
                  <AppScreen
                    {...props}
                    destination={destination}
                    onViewPlayer={onViewPlayer}
                  />
                </main>
                {showNavigation ? <Footer /> : null}
              </div>
              <AppOverlays {...props} />
            </div>
          </DailyReminderProvider>
        </InstallProvider>
      </SoundProvider>
    </MotionProvider>
  );
};

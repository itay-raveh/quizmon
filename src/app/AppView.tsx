import { isLeagueUnlocked } from '../domain/player/trainer-progression';
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
import { GenerationPromptDialog } from '../features/settings/GenerationPromptDialog';
import { SettingsDialog } from '../features/settings/SettingsDialog';
import type { useSettingsDialog } from '../features/settings/useSettingsDialog';
import { TrainerPassport } from '../features/trainer/TrainerPassport';
import type { useTrainerCard } from '../features/trainer/useTrainerCard';
import type { usePokemonCatalog } from '../hooks/usePokemonCatalog';
import { SoundProvider } from '../lib/audio/SoundProvider';
import { Footer } from './Footer';
import { BugReportButton } from './BugReportButton';
import { sentryEnabled } from '../lib/sentry';
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
type CatalogState = ReturnType<typeof usePokemonCatalog>;
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
  if (session.phase !== 'questions' && destination.destination === 'account') {
    return <AccountScreen />;
  }
  if (session.phase !== 'questions' && destination.destination === 'friends') {
    return (
      <>
        <div hidden={Boolean(destination.playerId)}>
          <FriendsScreen
            key={destination.friendCode}
            onRankings={() => destination.open('leaderboards')}
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
  if (
    session.phase !== 'questions' &&
    destination.destination === 'leaderboards'
  ) {
    return (
      <>
        <div hidden={Boolean(destination.playerId)}>
          <LeaderboardScreen
            catalog={
              catalogState.status === 'ready' ? catalogState.catalog : undefined
            }
            onFriends={() => destination.open('friends')}
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
  if (
    session.phase !== 'questions' &&
    trainer.isOpen &&
    catalogState.status === 'ready'
  ) {
    return (
      <TrainerPassport
        catalog={catalogState.catalog}
        onViewChange={trainer.showView}
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
  if (
    catalogState.status === 'ready' &&
    ((league.isOpen && leagueUnlocked) ||
      (leagueVictory && !league.showResults))
  ) {
    return (
      <LeagueDestination
        catalog={catalogState.catalog}
        completed={trainer.stats.leagueCompleted || leagueVictory}
        celebrate={leagueVictory}
        onBack={() => {
          league.close();
          void navigation.returnToLanding();
        }}
        onStart={league.start}
        onViewResults={
          leagueVictory ? () => league.setShowResults(true) : undefined
        }
        view={league.view ?? (leagueVictory ? 'hall' : 'challenge')}
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
        effects={
          catalogState.status === 'ready'
            ? catalogState.catalog.topics?.effects
            : undefined
        }
        evolutions={
          catalogState.status === 'ready'
            ? catalogState.catalog.topics?.evolutions
            : undefined
        }
        typeRelations={catalogState.catalog?.typeRelations}
        answerFlow={session.settings.answerFlow}
        key={currentQuestion.id}
        questionStartedMilliseconds={session.answers
          .slice(0, session.questionIndex)
          .reduce((sum, answer) => sum + (answer.responseMilliseconds ?? 0), 0)}
        elapsedMilliseconds={question.elapsedMilliseconds}
        elapsedSeconds={question.elapsedSeconds}
        interactionPaused={settingsDialog.isOpen}
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
      onRetryLeague={league.retry}
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
  training,
}: Pick<
  AppViewProps,
  | 'catalogState'
  | 'settings'
  | 'navigation'
  | 'session'
  | 'settingsDialog'
  | 'training'
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
    {training.generationPromptOpen ? (
      <GenerationPromptDialog
        onCancel={training.closeGenerationPrompt}
        onChooseAll={training.chooseAllGenerations}
        onChooseGenOne={training.chooseGenOne}
      />
    ) : null}
    {navigation.leaveConfirmationOpen ? (
      <LeaveGameDialog
        resumable={
          session.phase === 'questions' &&
          session.mode.kind === 'daily' &&
          Boolean(session.mode.track)
        }
        onCancel={navigation.cancelLeave}
        onConfirm={() => {
          void navigation.returnToLanding();
        }}
      />
    ) : null}
  </>
);
export const AppView = (props: AppViewProps) => {
  const destination = useAppDestination();
  const main = useRef<HTMLElement>(null);
  const profileTrigger = useRef<HTMLElement | null>(null);
  const sourceScroll = useRef(0);
  const screenKey =
    props.session.phase === 'questions'
      ? 'questions'
      : destination.playerId
        ? `player:${destination.playerId}`
        : (destination.destination ??
          (props.trainer.isOpen
            ? `trainer:${props.trainer.view}`
            : props.session.phase));
  const previousScreen = useRef(screenKey);
  useLayoutEffect(() => {
    if (previousScreen.current === screenKey) return;
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
    const heading = [
      ...(main.current?.querySelectorAll<HTMLElement>('h1') ?? []),
    ].find((heading) => !heading.closest('[hidden]'));
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }, [screenKey]);
  const onViewPlayer = (id: string) => {
    profileTrigger.current = document.activeElement as HTMLElement;
    destination.viewPlayer(id);
  };
  const showNavigation = props.session.phase !== 'questions';
  const active =
    destination.destination === 'account'
      ? null
      : destination.destination === 'leaderboards' ||
          destination.destination === 'friends'
        ? 'social'
        : props.trainer.isOpen
          ? 'trainer'
          : 'play';
  const onAccount = () => {
    if (destination.destination !== 'account') destination.account();
  };
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
              {showNavigation ? <BugReportButton /> : null}
              <div className="app__screen">
                {showNavigation ? (
                  <AppNavigation
                    active={active}
                    accountOpen={destination.destination === 'account'}
                    onAccount={onAccount}
                    onSettings={props.settingsDialog.open}
                    trainerAvailable={props.catalogState.status === 'ready'}
                    onNavigate={(next) => {
                      if (next === 'trainer') destination.trainer();
                      else if (next === 'social')
                        destination.open(
                          'leaderboards',
                          props.session.phase === 'results' &&
                            props.session.mode.kind === 'daily'
                            ? props.session.mode.date
                            : undefined,
                        );
                      else {
                        destination.play();
                        props.league.close();
                        void props.navigation.returnToLanding();
                      }
                    }}
                  />
                ) : null}
                <main ref={main}>
                  {!showNavigation && sentryEnabled ? (
                    <div className="bug-report-row">
                      <BugReportButton />
                    </div>
                  ) : null}
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

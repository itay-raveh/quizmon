import { Disclaimer, Footer } from '@/app/Footer';
import { HomeScreen } from '@/app/HomeScreen';
import { MotionProvider } from '@/app/providers/MotionProvider';
import { isLeagueUnlocked } from '@/domain/player/trainer-progression';
import { getLocalDate } from '@/domain/quiz/daily';
import { isLeagueVictory } from '@/domain/quiz/league';
import type { AnswerResult } from '@/domain/quiz/types';
import type { GameSettings } from '@/domain/settings/types';
import type { useDailyChallenge } from '@/features/daily/useDailyChallenge';
import { InstallProvider } from '@/features/installation/InstallProvider';
import { LeagueDestination } from '@/features/league/LeagueDestination';
import type { useLeagueChallenge } from '@/features/league/useLeagueChallenge';
import type { useLeagueDestination } from '@/features/league/useLeagueDestination';
import { LeaveGameDialog } from '@/features/quiz/LeaveGameDialog';
import { QuestionScreen } from '@/features/quiz/QuestionScreen';
import { ResultsScreen } from '@/features/quiz/ResultsScreen';
import type { useTrainingGame } from '@/features/quiz/useTrainingGame';
import { DailyReminderProvider } from '@/features/reminders/DailyReminderProvider';
import { GenerationPromptDialog } from '@/features/settings/GenerationPromptDialog';
import { SettingsDialog } from '@/features/settings/SettingsDialog';
import type { useSettingsDialog } from '@/features/settings/useSettingsDialog';
import { TrainerPassport } from '@/features/trainer/TrainerPassport';
import type { useTrainerCard } from '@/features/trainer/useTrainerCard';
import type { usePokemonCatalog } from '@/hooks/usePokemonCatalog';
import { SoundProvider } from '@/lib/audio/SoundProvider';
import type { GameSession } from './game-session';
import type { useGameNavigation } from './useGameNavigation';

type CatalogState = ReturnType<typeof usePokemonCatalog>;

interface QuestionView {
  assistance: (count: number) => void;
  answer: (answer: AnswerResult) => void;
  elapsedMilliseconds: number;
  elapsedSeconds: number;
  pauseTimer: () => number;
  recordAnswer: (answer: AnswerResult) => void;
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
}: AppViewProps) => {
  if (trainer.isOpen && catalogState.status === 'ready') {
    return (
      <TrainerPassport
        catalog={catalogState.catalog}
        onBack={trainer.close}
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
          navigation.returnToLanding();
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
          dailyStreak={daily.date === getLocalDate() ? daily.streak : 0}
          leagueUnlocked={leagueUnlocked}
          leagueCompleted={trainer.stats.leagueCompleted}
          onOpenSettings={settingsDialog.open}
          onOpenTrainerCard={() => trainer.open('front')}
          onRetryCatalog={catalogState.retry}
          onStart={training.start}
          onStartDaily={daily.start}
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
        interactionPaused={settingsDialog.isOpen}
        mode={session.mode}
        nextQuestion={session.questions[session.questionIndex + 1]}
        number={session.questionIndex + 1}
        onAssistance={question.assistance}
        onAnswer={question.answer}
        onAnswerRecorded={question.recordAnswer}
        onFeedbackStart={question.pauseTimer}
        onNewGame={navigation.requestLeave}
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
        session.mode.kind === 'daily' && session.mode.date === getLocalDate()
          ? daily.streak
          : 0
      }
      isNewBest={session.isNewBest}
      mode={session.mode}
      settings={session.settings}
      onNewGame={navigation.returnToLanding}
      onOpenTrainerCard={trainer.open}
      onOpenHallOfFame={() => {
        league.open('hall');
        league.setShowResults(false);
      }}
      onRetryLeague={league.retry}
      onTrainAgain={training.trainAgain}
      onStartTraining={training.start}
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
        onConfirm={navigation.returnToLanding}
      />
    ) : null}
  </>
);

export const AppView = (props: AppViewProps) => (
  <MotionProvider reduceMotion={props.settings.reduceMotion}>
    <SoundProvider
      prepareScoreCount={props.session.phase !== 'landing'}
      volume={props.settings.soundVolume}
    >
      <InstallProvider>
        <DailyReminderProvider>
          <div
            className={`app app--${props.trainer.isOpen ? 'trainer' : props.session.phase}`}
          >
            <div className="background" aria-hidden="true" />
            <div className="app__screen">
              <main>
                <AppScreen {...props} />
              </main>
              <Footer showSupport={props.session.phase !== 'questions'} />
            </div>
            <Disclaimer />
            <AppOverlays {...props} />
          </div>
        </DailyReminderProvider>
      </InstallProvider>
    </SoundProvider>
  </MotionProvider>
);

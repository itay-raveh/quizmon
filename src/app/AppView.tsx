import { SoundProvider } from '@/audio/SoundProvider';
import { Footer } from '@/components/Footer';
import { GenerationPromptDialog } from '@/components/GenerationPromptDialog';
import { LeagueDestination } from '@/components/LeagueDestination';
import { isLeagueVictory } from '@/game/league';
import { Landing } from '@/components/Landing';
import { LeaveGameDialog } from '@/components/LeaveGameDialog';
import { ModifiersDialog } from '@/components/ModifiersDialog';
import { MotionProvider } from '@/components/MotionProvider';
import { DailyReminderProvider } from '@/notifications/DailyReminderProvider';
import { InstallProvider } from '@/pwa/InstallProvider';
import { Question } from '@/components/Question';
import { Results } from '@/components/Results';
import { TrainerPassport } from '@/components/TrainerPassport';
import { getLocalDate } from '@/game/daily';
import type { usePokemonCatalog } from '@/game/catalog';
import { isLeagueUnlocked } from '@/game/trainer';
import type { AnswerResult, Modifiers } from '@/game/types';
import type { GameSession } from './session';
import type { useDailyChallenge } from './useDailyChallenge';
import type { useGameNavigation } from './useGameNavigation';
import type { useLeagueDestination } from './useLeagueDestination';
import type { useLeagueChallenge } from './useLeagueChallenge';
import type { useSettingsDialog } from './useSettingsDialog';
import type { useTrainerCard } from './useTrainerCard';
import type { useTrainingGame } from './useTrainingGame';

type CatalogState = ReturnType<typeof usePokemonCatalog>;

interface QuestionView {
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
  modifiers: Modifiers;
  navigation: ReturnType<typeof useGameNavigation>;
  question: QuestionView;
  session: GameSession;
  settings: ReturnType<typeof useSettingsDialog>;
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
  settings,
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
      <Landing
        catalogStatus={catalogState.status}
        dailyDate={daily.date}
        dailyResult={daily.result}
        dailyResultSaved={daily.resultSaved}
        dailyStreak={daily.date === getLocalDate() ? daily.streak : 0}
        leagueUnlocked={leagueUnlocked}
        leagueCompleted={trainer.stats.leagueCompleted}
        onOpenSettings={settings.open}
        onOpenTrainerCard={() => trainer.open('front')}
        onRetryCatalog={catalogState.retry}
        onStart={training.start}
        onStartDaily={daily.start}
        onStartLeague={() =>
          league.open(trainer.stats.leagueCompleted ? 'hall' : 'challenge')
        }
        storageAvailable={daily.storageAvailable}
      />
    );
  }

  if (session.phase === 'questions') {
    const currentQuestion = session.questions[session.questionIndex];
    return currentQuestion ? (
      <Question
        typeRelations={catalogState.catalog?.typeRelations}
        answerFlow={session.modifiers.answerFlow}
        key={currentQuestion.id}
        elapsedMilliseconds={question.elapsedMilliseconds}
        elapsedSeconds={question.elapsedSeconds}
        interactionPaused={settings.isOpen}
        mode={session.mode}
        nextQuestion={session.questions[session.questionIndex + 1]}
        number={session.questionIndex + 1}
        onAnswer={question.answer}
        onAnswerRecorded={question.recordAnswer}
        onFeedbackStart={question.pauseTimer}
        onNewGame={navigation.requestLeave}
        question={currentQuestion}
        timerDisplay={session.modifiers.timerDisplay}
        total={session.questions.length}
      />
    ) : null;
  }

  return (
    <Results
      bestResult={session.bestResult}
      dailyStreak={
        session.mode.kind === 'daily' && session.mode.date === getLocalDate()
          ? daily.streak
          : 0
      }
      isNewBest={session.isNewBest}
      mode={session.mode}
      modifiers={session.modifiers}
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
  modifiers,
  navigation,
  session,
  settings,
  training,
}: Pick<
  AppViewProps,
  | 'catalogState'
  | 'modifiers'
  | 'navigation'
  | 'session'
  | 'settings'
  | 'training'
>) => (
  <>
    <Footer showSupport={session.phase !== 'questions'} />
    {settings.isOpen && catalogState.status === 'ready' ? (
      <ModifiersDialog
        catalog={catalogState.catalog}
        modifiers={modifiers}
        onClose={settings.close}
        onSave={settings.save}
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
        onCancel={navigation.cancelLeave}
        onConfirm={navigation.returnToLanding}
      />
    ) : null}
  </>
);

export const AppView = (props: AppViewProps) => (
  <MotionProvider reduceMotion={props.modifiers.reduceMotion}>
    <SoundProvider
      prepareScoreCount={props.session.phase !== 'landing'}
      volume={props.modifiers.soundVolume}
    >
      <InstallProvider>
        <DailyReminderProvider>
          <div
            className={`app app--${props.trainer.isOpen ? 'trainer' : props.session.phase}`}
          >
            <div className="background" aria-hidden="true" />
            <main>
              <AppScreen {...props} />
            </main>
            <AppOverlays {...props} />
          </div>
        </DailyReminderProvider>
      </InstallProvider>
    </SoundProvider>
  </MotionProvider>
);

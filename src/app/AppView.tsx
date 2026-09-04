import { SoundProvider } from '@/audio/SoundProvider';
import { Footer } from '@/components/Footer';
import { GenerationPromptDialog } from '@/components/GenerationPromptDialog';
import { Landing } from '@/components/Landing';
import { LeaveGameDialog } from '@/components/LeaveGameDialog';
import {
  ModifiersDialog,
  type SettingsTab,
} from '@/components/ModifiersDialog';
import { Question } from '@/components/Question';
import { Results } from '@/components/Results';
import { TrainerPassport } from '@/components/TrainerPassport';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { getUtcDate } from '@/game/daily';
import type { usePokemonCatalog } from '@/game/catalog';
import type { TrainerStats } from '@/game/storage';
import type { TrainerProfile } from '@/game/trainer-profile';
import type { AnswerResult, GameResult, Modifiers } from '@/game/types';
import type { GameSession } from './session';

type CatalogState = ReturnType<typeof usePokemonCatalog>;

interface DailyView {
  date: string;
  result: GameResult | null;
  resultSaved: boolean;
  start: () => void;
  storageAvailable: boolean;
  streak: number;
}

interface NavigationView {
  cancelLeave: () => void;
  leaveConfirmationOpen: boolean;
  requestLeave: () => void;
  returnToLanding: () => void;
}

interface QuestionView {
  answer: (answer: AnswerResult) => void;
  elapsedMilliseconds: number;
  elapsedSeconds: number;
  pauseTimer: () => number;
  recordAnswer: (answer: AnswerResult) => void;
}

interface SettingsView {
  close: () => void;
  open: (tab: SettingsTab) => void;
  save: (modifiers: Modifiers) => void;
  state: { initialTab: SettingsTab } | null;
}

interface TrainerView {
  close: () => void;
  isOpen: boolean;
  open: () => void;
  profile: TrainerProfile;
  stats: TrainerStats;
  updateProfile: (profile: TrainerProfile) => void;
}

interface TrainingView {
  chooseAllGenerations: () => void;
  chooseGenOne: () => void;
  closeGenerationPrompt: () => void;
  generationPromptOpen: boolean;
  start: () => void;
  trainAgain: () => void;
}

interface AppViewProps {
  catalogState: CatalogState;
  daily: DailyView;
  modifiers: Modifiers;
  navigation: NavigationView;
  question: QuestionView;
  session: GameSession;
  settings: SettingsView;
  trainer: TrainerView;
  training: TrainingView;
}

const AppScreen = ({
  catalogState,
  daily,
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
        onProfileChange={trainer.updateProfile}
        profile={trainer.profile}
        stats={trainer.stats}
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
        dailyStreak={daily.date === getUtcDate() ? daily.streak : 0}
        onOpenSettings={() => settings.open('training')}
        onOpenTrainerCard={trainer.open}
        onRetryCatalog={catalogState.retry}
        onStart={training.start}
        onStartDaily={daily.start}
        storageAvailable={daily.storageAvailable}
      />
    );
  }

  if (session.phase === 'questions') {
    const currentQuestion = session.questions[session.questionIndex];
    return currentQuestion ? (
      <Question
        key={currentQuestion.id}
        elapsedMilliseconds={question.elapsedMilliseconds}
        elapsedSeconds={question.elapsedSeconds}
        interactionPaused={Boolean(settings.state)}
        mode={session.mode}
        nextQuestion={session.questions[session.questionIndex + 1]}
        number={session.questionIndex + 1}
        onAnswer={question.answer}
        onAnswerRecorded={question.recordAnswer}
        onFeedbackStart={question.pauseTimer}
        onNewGame={navigation.requestLeave}
        onOpenSettings={() => settings.open('experience')}
        question={currentQuestion}
        speedrunMode={session.modifiers.speedrunMode}
        total={session.questions.length}
      />
    ) : null;
  }

  return (
    <Results
      bestResult={session.bestResult}
      dailyStreak={
        session.mode.kind === 'daily' && session.mode.date === getUtcDate()
          ? daily.streak
          : 0
      }
      isNewBest={session.isNewBest}
      mode={session.mode}
      onNewGame={navigation.returnToLanding}
      onOpenSettings={() => settings.open('experience')}
      onOpenTrainerCard={trainer.open}
      onTrainAgain={training.trainAgain}
      result={session.result}
      resultSaved={session.resultSaved}
      badgeChanges={session.badgeChanges}
    />
  );
};

const AppOverlays = ({
  catalogState,
  modifiers,
  navigation,
  session,
  settings,
  trainer,
  training,
}: Pick<
  AppViewProps,
  | 'catalogState'
  | 'modifiers'
  | 'navigation'
  | 'session'
  | 'settings'
  | 'trainer'
  | 'training'
>) => (
  <>
    <UpdatePrompt
      visible={
        session.phase !== 'questions' &&
        !trainer.isOpen &&
        !settings.state &&
        !training.generationPromptOpen
      }
    />
    <Footer />
    {settings.state && catalogState.status === 'ready' ? (
      <ModifiersDialog
        catalog={catalogState.catalog}
        initialTab={settings.state.initialTab}
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
  <SoundProvider
    enabled={props.modifiers.soundEnabled}
    prepareScoreCount={props.session.phase !== 'landing'}
  >
    <div
      className={`app app--${props.trainer.isOpen ? 'trainer' : props.session.phase}`}
    >
      <div className="background" aria-hidden="true" />
      <main>
        <AppScreen {...props} />
      </main>
      <AppOverlays {...props} />
    </div>
  </SoundProvider>
);

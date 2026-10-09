import { Navigate } from '@tanstack/react-router';
import { getTrainerBadges } from '../domain/player/trainer-progression';
import { defaultGameSettings } from '../domain/settings/game-settings';
import { getUtcDate } from '../domain/quiz/daily';
import { getRoundAnswerLevel } from '../domain/quiz/scoring';
import { isLeagueVictory } from '../domain/quiz/league';
import { QuestionScreen } from '../features/quiz/QuestionScreen';
import { ResultsScreen } from '../features/quiz/ResultsScreen';
import { HomeScreen } from './HomeScreen';
import { useAppGameContext } from './AppGameContext';

const Home = () => {
  const {
    catalogState,
    daily,
    league,
    settings,
    settingsDialog,
    trainer,
    training,
  } = useAppGameContext();
  return (
    <>
      {training.error && <p role="alert">{training.error}</p>}
      <HomeScreen
        catalogStatus={catalogState.status}
        dailyDate={daily.date}
        dailyResult={daily.result}
        dailyResultSaved={daily.resultSaved}
        dailyForfeited={daily.forfeited}
        dailyError={daily.error}
        dailyStreak={daily.date === getUtcDate() ? daily.streak : 0}
        level={settings.level ?? defaultGameSettings.level!}
        selectedGenerations={settings.generations}
        customized={settings.questionSelection === 'custom'}
        onChooseGenerations={settingsDialog.openGenerations}
        onChooseLevel={settingsDialog.openLevel}
        badges={getTrainerBadges(trainer.stats)}
        leagueCompleted={trainer.stats.leagueCompleted}
        onCustomizeTraining={settingsDialog.openTraining}
        onRetryCatalog={catalogState.retry}
        onStart={training.start}
        onStartDaily={() => void daily.start()}
        onStartLeague={() =>
          league.open(trainer.stats.leagueCompleted ? 'hall' : 'challenge')
        }
        storageAvailable={daily.storageAvailable}
      />
    </>
  );
};

export const QuestionRouteScreen = () => {
  const {
    catalogState,
    navigation,
    question,
    routeLeave,
    session,
    settingsDialog,
  } = useAppGameContext();
  if (session.phase !== 'questions') return null;
  const currentQuestion = session.questions[session.questionIndex];
  return currentQuestion ? (
    <QuestionScreen
      level={getRoundAnswerLevel(
        session.mode,
        session.settings.level,
        session.questionIndex,
      )}
      typeRelations={catalogState.catalog?.typeRelations}
      answerFlow={session.settings.answerFlow}
      key={currentQuestion.id}
      questionStartedMilliseconds={session.answers
        .slice(0, session.questionIndex)
        .reduce((sum, answer) => sum + (answer.responseMilliseconds ?? 0), 0)}
      getElapsedMilliseconds={question.getElapsedMilliseconds}
      interactionPaused={
        settingsDialog.isOpen ||
        navigation.leaveConfirmationOpen ||
        routeLeave.open
      }
      mode={session.mode}
      nextQuestion={session.questions[session.questionIndex + 1]}
      number={session.questionIndex + 1}
      onAssistance={question.assistance}
      onAnswer={question.answer}
      onAnswerRecorded={question.recordAnswer}
      onFeedbackStart={question.pauseTimer}
      onNewGame={() => void navigation.requestLeave()}
      question={currentQuestion}
      timerDisplay={session.settings.timerDisplay}
      timerRunning={question.timerRunning}
      total={session.questions.length}
    />
  ) : null;
};

export const ResultsRouteScreen = () => {
  const { daily, league, navigation, session, settingsDialog, training } =
    useAppGameContext();
  if (session.phase !== 'results') return null;
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
        navigation.returnToLanding();
        if (session.mode.kind === 'league') league.close();
      }}
      onRetryLeague={() => void league.start()}
      onTrainAgain={training.trainAgain}
      onChooseLevel={settingsDialog.openLevel}
      onStartTraining={training.start}
      trainingError={training.error}
      result={session.result}
      resultSaved={session.resultSaved}
      roundSeed={session.seed}
      progressChanges={session.progressChanges}
    />
  );
};

export const PlayRouteScreen = () => {
  const { session } = useAppGameContext();
  if (session.phase === 'landing') return <Home />;
  if (session.phase === 'questions') return <QuestionRouteScreen />;
  if (session.mode.kind === 'league' && isLeagueVictory(session.result))
    return (
      <Navigate to="/league" search={{ view: 'hall' }} replace ignoreBlocker />
    );
  return <ResultsRouteScreen />;
};

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
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
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { usePokemonCatalog } from '@/game/catalog';
import { trackGameCompleted } from '@/game/analytics';
import {
  buildDailyQuestions,
  getDailyModifiers,
  getUtcDate,
  parseDailyDate,
  shouldAutoStartDaily,
} from '@/game/daily';
import {
  buildQuestions,
  calculateScore,
  getResponseTimeSeconds,
  SCORE_VERSION,
} from '@/game/game';
import {
  canPersistResults,
  markGenerationPromptAnswered,
  readDailyResult,
  readDailyStreak,
  saveResult,
  shouldShowGenerationPrompt,
  usePersistentModifiers,
} from '@/game/storage';
import { useStopwatch } from '@/game/stopwatch';
import { generations } from '@/game/types';
import type {
  GameMode,
  GameResult,
  Generation,
  Modifiers,
  AnswerResult,
  QuestionData,
} from '@/game/types';
import { gameSessionReducer, initialGameSession } from './session';

interface SettingsState {
  initialTab: SettingsTab;
}

export const App = () => {
  const catalogState = usePokemonCatalog();
  const [modifiers, setModifiers] = usePersistentModifiers();
  const [session, dispatchSession] = useReducer(
    gameSessionReducer,
    initialGameSession,
  );
  const phase = session.phase;
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [generationPromptOpen, setGenerationPromptOpen] = useState(false);
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const [generationPromptPending, setGenerationPromptPending] = useState(
    shouldShowGenerationPrompt,
  );
  const [dailyDate] = useState(
    () => parseDailyDate(window.location.search) ?? getUtcDate(),
  );
  const [autoStartDaily] = useState(() =>
    shouldAutoStartDaily(window.location.search),
  );
  const [dailyResult, setDailyResult] = useState<GameResult | null>(() =>
    readDailyResult(parseDailyDate(window.location.search) ?? getUtcDate()),
  );
  const [dailyResultSaved, setDailyResultSaved] = useState(() =>
    Boolean(
      readDailyResult(parseDailyDate(window.location.search) ?? getUtcDate()),
    ),
  );
  const [dailyStreak, setDailyStreak] = useState(readDailyStreak);
  const [storageAvailable] = useState(canPersistResults);
  const linkedDailyStarted = useRef(false);
  const { elapsedMilliseconds, elapsedSeconds, pause, reset, start } =
    useStopwatch();

  useEffect(() => {
    const syncDailyResult = () => {
      const saved = readDailyResult(dailyDate);
      if (saved) {
        setDailyResult(saved);
        setDailyResultSaved(true);
      }
      setDailyStreak(readDailyStreak());
    };

    window.addEventListener('focus', syncDailyResult);
    window.addEventListener('storage', syncDailyResult);
    return () => {
      window.removeEventListener('focus', syncDailyResult);
      window.removeEventListener('storage', syncDailyResult);
    };
  }, [dailyDate]);

  const startGame = useCallback(
    (
      nextQuestions: QuestionData[],
      nextModifiers: Modifiers,
      nextMode: GameMode,
    ) => {
      dispatchSession({
        mode: nextMode,
        modifiers: nextModifiers,
        questions: nextQuestions,
        type: 'started',
      });
      reset();
      start();
    },
    [reset, start],
  );

  const startCustomGameWithGenerations = (generations: Generation[]) => {
    if (catalogState.status !== 'ready') return;

    const nextModifiers = { ...modifiers, generations };
    setModifiers(nextModifiers);
    markGenerationPromptAnswered();
    setGenerationPromptPending(false);
    setGenerationPromptOpen(false);
    startGame(
      buildQuestions(catalogState.catalog, nextModifiers),
      nextModifiers,
      { kind: 'training' },
    );
  };

  const startCustomGame = () => {
    if (catalogState.status !== 'ready') return;

    if (generationPromptPending) {
      setGenerationPromptOpen(true);
      return;
    }

    startGame(buildQuestions(catalogState.catalog, modifiers), modifiers, {
      kind: 'training',
    });
  };

  const startDailyGame = useCallback(() => {
    if (catalogState.status !== 'ready' || dailyResult || !storageAvailable)
      return;

    const saved = readDailyResult(dailyDate);
    if (saved) {
      setDailyResult(saved);
      setDailyResultSaved(true);
      return;
    }

    const dailyModifiers = getDailyModifiers(modifiers);
    startGame(
      buildDailyQuestions(catalogState.catalog, dailyDate),
      dailyModifiers,
      { kind: 'daily', date: dailyDate },
    );
  }, [
    catalogState,
    dailyDate,
    dailyResult,
    modifiers,
    startGame,
    storageAvailable,
  ]);

  useEffect(() => {
    if (
      !autoStartDaily ||
      linkedDailyStarted.current ||
      catalogState.status !== 'ready'
    )
      return;

    linkedDailyStarted.current = true;
    startDailyGame();
  }, [autoStartDaily, catalogState.status, startDailyGame]);

  const newGame = useCallback(() => {
    pause();
    reset();
    setLeaveConfirmationOpen(false);
    dispatchSession({ type: 'returned-to-landing' });
  }, [pause, reset]);

  const requestLeaveGame = useCallback(() => {
    if (session.phase !== 'questions' || session.answers.length === 0) {
      newGame();
      return;
    }

    pause();
    setLeaveConfirmationOpen(true);
  }, [newGame, pause, session]);

  const cancelLeaveGame = useCallback(() => {
    setLeaveConfirmationOpen(false);
    start();
  }, [start]);

  const openSettings = useCallback(
    (initialTab: SettingsTab) => {
      if (phase === 'questions') pause();
      setSettings({ initialTab });
    },
    [pause, phase],
  );

  const closeSettings = useCallback(() => {
    setSettings(null);
    if (phase === 'questions') start();
  }, [phase, start]);

  const saveSettings = useCallback(
    (nextModifiers: Modifiers) => {
      setModifiers(nextModifiers);
      if (generationPromptPending) {
        markGenerationPromptAnswered();
        setGenerationPromptPending(false);
      }
      if (phase === 'questions') {
        dispatchSession({
          soundEnabled: nextModifiers.soundEnabled,
          speedrunMode: nextModifiers.speedrunMode,
          type: 'experience-updated',
        });
      }
      setSettings(null);
      if (phase === 'questions') start();
    },
    [generationPromptPending, phase, setModifiers, start],
  );

  const answerQuestion = useCallback(
    (answer: AnswerResult) => {
      if (session.phase !== 'questions') return;
      const nextAnswers = [...session.answers, answer];

      if (session.questionIndex === session.questions.length - 1) {
        const nextCorrectCount = nextAnswers.filter(
          ({ correct }) => correct,
        ).length;
        const nextResult = {
          answers: nextAnswers,
          contentVersion:
            catalogState.status === 'ready'
              ? catalogState.catalog.contentVersion
              : 0,
          correctCount: nextCorrectCount,
          elapsedSeconds: getResponseTimeSeconds(nextAnswers),
          questionCount: session.questions.length,
          score: calculateScore(nextAnswers),
          scoreVersion: SCORE_VERSION,
        };
        const best = saveResult(session.mode, nextResult);
        trackGameCompleted(session.mode, nextResult);
        dispatchSession({
          bestResult: best.best,
          isNewBest: best.isNewBest,
          result: nextResult,
          resultSaved: best.isSaved,
          type: 'completed',
        });
        if (session.mode.kind === 'daily') {
          setDailyResult(best.best);
          setDailyResultSaved(best.isSaved);
          if (best.isSaved) setDailyStreak(readDailyStreak());
        }
        pause();
      } else {
        dispatchSession({ answer, type: 'advanced' });
        start();
      }
    },
    [catalogState, pause, session, start],
  );

  const question =
    session.phase === 'questions'
      ? session.questions[session.questionIndex]
      : undefined;

  return (
    <SoundProvider enabled={modifiers.soundEnabled}>
      <div className={`app app--${phase}`}>
        <div className="background" aria-hidden="true" />
        <main>
          {phase === 'landing' ? (
            <Landing
              catalogStatus={catalogState.status}
              dailyDate={dailyDate}
              dailyResult={dailyResult}
              dailyResultSaved={dailyResultSaved}
              dailyStreak={dailyDate === getUtcDate() ? dailyStreak : 0}
              onOpenSettings={() => openSettings('training')}
              onRetryCatalog={catalogState.retry}
              onStart={startCustomGame}
              onStartDaily={startDailyGame}
              storageAvailable={storageAvailable}
            />
          ) : null}

          {session.phase === 'questions' && question ? (
            <Question
              key={question.id}
              elapsedMilliseconds={elapsedMilliseconds}
              elapsedSeconds={elapsedSeconds}
              interactionPaused={Boolean(settings)}
              mode={session.mode}
              speedrunMode={session.modifiers.speedrunMode}
              nextQuestion={session.questions[session.questionIndex + 1]}
              number={session.questionIndex + 1}
              onAnswer={answerQuestion}
              onFeedbackStart={pause}
              onNewGame={requestLeaveGame}
              onOpenSettings={() => openSettings('experience')}
              question={question}
              total={session.questions.length}
            />
          ) : null}

          {session.phase === 'results' ? (
            <Results
              bestResult={session.bestResult}
              dailyStreak={
                session.mode.kind === 'daily' &&
                session.mode.date === getUtcDate()
                  ? dailyStreak
                  : 0
              }
              isNewBest={session.isNewBest}
              mode={session.mode}
              onNewGame={newGame}
              onOpenSettings={() => openSettings('experience')}
              result={session.result}
              resultSaved={session.resultSaved}
            />
          ) : null}
        </main>

        <UpdatePrompt
          visible={phase !== 'questions' && !settings && !generationPromptOpen}
        />

        <Footer />

        {settings && catalogState.status === 'ready' ? (
          <ModifiersDialog
            catalog={catalogState.catalog}
            initialTab={settings.initialTab}
            modifiers={modifiers}
            onClose={closeSettings}
            onSave={saveSettings}
            trainingChangesApplyNextGame={phase !== 'landing'}
          />
        ) : null}

        {generationPromptOpen ? (
          <GenerationPromptDialog
            onCancel={() => setGenerationPromptOpen(false)}
            onChooseAll={() => startCustomGameWithGenerations([...generations])}
            onChooseGenOne={() => startCustomGameWithGenerations(['I'])}
          />
        ) : null}

        {leaveConfirmationOpen ? (
          <LeaveGameDialog onCancel={cancelLeaveGame} onConfirm={newGame} />
        ) : null}
      </div>
    </SoundProvider>
  );
};

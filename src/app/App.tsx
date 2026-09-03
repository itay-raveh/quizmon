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
import { TrainerPassport } from '@/components/TrainerPassport';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { usePokemonCatalog } from '@/game/catalog';
import { trackGameCompleted } from '@/game/analytics';
import {
  clearActiveGame,
  readActiveGame,
  writeActiveGame,
} from '@/game/active-game';
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
import { createRoundSeed, createSeededRandom } from '@/game/random';
import {
  canPersistResults,
  readDailyResult,
  readDailyStreak,
  readTrainerStats,
  saveResult,
} from '@/game/storage';
import {
  markGenerationPromptAnswered,
  shouldShowGenerationPrompt,
  usePersistentModifiers,
} from '@/game/settings-storage';
import {
  readTrainerProfile,
  saveTrainerProfile,
  type TrainerProfile,
} from '@/game/trainer-profile';
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
  const [trainerCardOpen, setTrainerCardOpen] = useState(() =>
    new URLSearchParams(window.location.search).has('trainer'),
  );
  const [generationPromptOpen, setGenerationPromptOpen] = useState(false);
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const generationPromptPending = useRef<boolean | null>(null);
  const isGenerationPromptPending = () => {
    generationPromptPending.current ??= shouldShowGenerationPrompt();
    return generationPromptPending.current;
  };
  const [linkedDailyDate] = useState(() =>
    parseDailyDate(window.location.search),
  );
  const [dailyDate] = useState(() => linkedDailyDate ?? getUtcDate());
  const [autoStartDaily] = useState(
    () =>
      !new URLSearchParams(window.location.search).has('trainer') &&
      shouldAutoStartDaily(window.location.search),
  );
  const [dailyResult, setDailyResult] = useState<GameResult | null>(() =>
    readDailyResult(linkedDailyDate ?? getUtcDate()),
  );
  const [dailyResultSaved, setDailyResultSaved] = useState(() =>
    Boolean(readDailyResult(linkedDailyDate ?? getUtcDate())),
  );
  const [dailyStreak, setDailyStreak] = useState(readDailyStreak);
  const [trainerStats, setTrainerStats] = useState(readTrainerStats);
  const [trainerProfile, setTrainerProfile] = useState(readTrainerProfile);
  const [storageAvailable] = useState(canPersistResults);
  const restorationAttempted = useRef(false);
  const {
    elapsedMilliseconds,
    elapsedSeconds,
    getElapsedMilliseconds,
    pause,
    reset,
    start,
  } = useStopwatch();

  useEffect(() => {
    const syncDailyResult = () => {
      const saved = readDailyResult(dailyDate);
      if (saved) {
        setDailyResult(saved);
        setDailyResultSaved(true);
      }
      setDailyStreak(readDailyStreak());
      setTrainerStats(readTrainerStats());
      setTrainerProfile(readTrainerProfile());
    };

    window.addEventListener('focus', syncDailyResult);
    window.addEventListener('storage', syncDailyResult);
    return () => {
      window.removeEventListener('focus', syncDailyResult);
      window.removeEventListener('storage', syncDailyResult);
    };
  }, [dailyDate]);

  useEffect(() => {
    const syncTrainerRoute = () =>
      setTrainerCardOpen(
        new URLSearchParams(window.location.search).has('trainer'),
      );
    window.addEventListener('popstate', syncTrainerRoute);
    return () => window.removeEventListener('popstate', syncTrainerRoute);
  }, []);

  const openTrainerCard = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('trainer', '1');
    window.history.pushState({ quizmonTrainerCard: true }, '', url);
    setTrainerCardOpen(true);
  }, []);

  const closeTrainerCard = useCallback(() => {
    const historyState: unknown = window.history.state;
    if (
      historyState !== null &&
      typeof historyState === 'object' &&
      'quizmonTrainerCard' in historyState &&
      historyState.quizmonTrainerCard === true
    ) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('trainer');
    window.history.replaceState(window.history.state, '', url);
    setTrainerCardOpen(false);
  }, []);

  const updateTrainerProfile = useCallback((profile: TrainerProfile) => {
    setTrainerProfile(saveTrainerProfile(profile));
  }, []);

  const startGame = useCallback(
    (
      nextQuestions: QuestionData[],
      nextModifiers: Modifiers,
      nextMode: GameMode,
      seed: string,
    ) => {
      dispatchSession({
        mode: nextMode,
        modifiers: nextModifiers,
        questions: nextQuestions,
        seed,
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
    generationPromptPending.current = false;
    setGenerationPromptOpen(false);
    const seed = createRoundSeed();
    startGame(
      buildQuestions(
        catalogState.catalog,
        nextModifiers,
        createSeededRandom(seed),
      ),
      nextModifiers,
      { kind: 'training' },
      seed,
    );
  };

  const startCustomGame = () => {
    if (catalogState.status !== 'ready') return;

    if (isGenerationPromptPending()) {
      setGenerationPromptOpen(true);
      return;
    }

    const seed = createRoundSeed();
    startGame(
      buildQuestions(catalogState.catalog, modifiers, createSeededRandom(seed)),
      modifiers,
      { kind: 'training' },
      seed,
    );
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
      `daily:${dailyDate}`,
    );
  }, [
    catalogState,
    dailyDate,
    dailyResult,
    modifiers,
    startGame,
    storageAvailable,
  ]);

  const newGame = useCallback(() => {
    clearActiveGame();
    pause();
    reset();
    setLeaveConfirmationOpen(false);
    dispatchSession({ type: 'returned-to-landing' });
  }, [pause, reset]);

  const trainAgain = useCallback(() => {
    if (
      session.phase !== 'results' ||
      session.mode.kind !== 'training' ||
      catalogState.status !== 'ready'
    ) {
      return;
    }

    const seed = createRoundSeed();
    startGame(
      buildQuestions(
        catalogState.catalog,
        session.modifiers,
        createSeededRandom(seed),
      ),
      session.modifiers,
      { kind: 'training' },
      seed,
    );
  }, [catalogState, session, startGame]);

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
      if (isGenerationPromptPending()) {
        markGenerationPromptAnswered();
        generationPromptPending.current = false;
      }
      if (phase === 'questions' || phase === 'results') {
        dispatchSession({
          modifiers: nextModifiers,
          type: 'settings-updated',
        });
      }
      setSettings(null);
      if (phase === 'questions') start();
    },
    [phase, setModifiers, start],
  );

  const completeGame = useCallback(
    (
      nextAnswers: AnswerResult[],
      mode: GameMode,
      gameModifiers: Modifiers,
      questionCount: number,
    ) => {
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
        questionCount,
        score: calculateScore(nextAnswers),
        scoreVersion: SCORE_VERSION,
      };
      const best = saveResult(mode, nextResult, gameModifiers);
      clearActiveGame();
      setTrainerStats(readTrainerStats());
      trackGameCompleted(mode, nextResult);
      dispatchSession({
        bestResult: best.best,
        isNewBest: best.isNewBest,
        result: nextResult,
        resultSaved: best.isSaved,
        type: 'completed',
      });
      if (mode.kind === 'daily') {
        setDailyResult(best.best);
        setDailyResultSaved(best.isSaved);
        if (best.isSaved) setDailyStreak(readDailyStreak());
      }
      pause();
    },
    [catalogState, pause],
  );

  useEffect(() => {
    if (catalogState.status !== 'ready' || restorationAttempted.current) return;
    const timeoutId = window.setTimeout(() => {
      if (restorationAttempted.current) return;
      restorationAttempted.current = true;

      const snapshot = readActiveGame();
      const conflictsWithDailyLink =
        linkedDailyDate !== null &&
        (snapshot?.mode.kind !== 'daily' ||
          snapshot.mode.date !== linkedDailyDate);
      const staleDaily =
        snapshot?.mode.kind === 'daily' && snapshot.mode.date !== dailyDate;
      const completedDaily =
        snapshot?.mode.kind === 'daily' &&
        Boolean(readDailyResult(snapshot.mode.date));

      if (
        !snapshot ||
        conflictsWithDailyLink ||
        staleDaily ||
        completedDaily ||
        snapshot.contentVersion !== catalogState.catalog.contentVersion
      ) {
        if (snapshot) clearActiveGame();
        if (autoStartDaily && phase === 'landing') startDailyGame();
        return;
      }

      const questions =
        snapshot.mode.kind === 'daily'
          ? buildDailyQuestions(catalogState.catalog, snapshot.mode.date)
          : buildQuestions(
              catalogState.catalog,
              snapshot.modifiers,
              createSeededRandom(snapshot.seed),
            );
      const answersMatchQuestions =
        snapshot.answers.length <= questions.length &&
        snapshot.answers.every(
          (answer, index) => answer.category === questions[index]?.category,
        );

      if (
        questions.length !== snapshot.questionCount ||
        !answersMatchQuestions
      ) {
        clearActiveGame();
        if (autoStartDaily && phase === 'landing') startDailyGame();
        return;
      }

      dispatchSession({
        answers: snapshot.answers,
        mode: snapshot.mode,
        modifiers: snapshot.modifiers,
        questions,
        seed: snapshot.seed,
        type: 'restored',
      });
      reset(snapshot.elapsedMilliseconds);

      if (snapshot.answers.length === questions.length) {
        completeGame(
          snapshot.answers,
          snapshot.mode,
          snapshot.modifiers,
          questions.length,
        );
      } else {
        start();
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    autoStartDaily,
    catalogState,
    completeGame,
    dailyDate,
    linkedDailyDate,
    phase,
    reset,
    start,
    startDailyGame,
  ]);

  const persistActiveGame = useCallback(() => {
    if (catalogState.status !== 'ready' || session.phase !== 'questions') {
      return;
    }

    writeActiveGame({
      answers: session.answers,
      contentVersion: catalogState.catalog.contentVersion,
      elapsedMilliseconds: getElapsedMilliseconds(),
      mode: session.mode,
      modifiers: session.modifiers,
      questionCount: session.questions.length,
      seed: session.seed,
    });
  }, [catalogState, getElapsedMilliseconds, session]);

  useEffect(() => {
    persistActiveGame();
  }, [elapsedSeconds, persistActiveGame]);

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') persistActiveGame();
    };

    document.addEventListener('visibilitychange', saveWhenHidden);
    return () =>
      document.removeEventListener('visibilitychange', saveWhenHidden);
  }, [persistActiveGame]);

  const recordAnswer = useCallback((answer: AnswerResult) => {
    dispatchSession({ answer, type: 'answer-recorded' });
  }, []);

  const answerQuestion = useCallback(
    (answer: AnswerResult) => {
      if (session.phase !== 'questions') return;
      const nextAnswers =
        session.answers.length === session.questionIndex
          ? [...session.answers, answer]
          : session.answers;

      if (session.questionIndex === session.questions.length - 1) {
        completeGame(
          nextAnswers,
          session.mode,
          session.modifiers,
          session.questions.length,
        );
      } else {
        dispatchSession({ answer, type: 'advanced' });
        start();
      }
    },
    [completeGame, session, start],
  );

  const question =
    session.phase === 'questions'
      ? session.questions[session.questionIndex]
      : undefined;

  return (
    <SoundProvider enabled={modifiers.soundEnabled}>
      <div className={`app app--${trainerCardOpen ? 'trainer' : phase}`}>
        <div className="background" aria-hidden="true" />
        <main>
          {trainerCardOpen && catalogState.status === 'ready' ? (
            <TrainerPassport
              catalog={catalogState.catalog}
              onBack={closeTrainerCard}
              onProfileChange={updateTrainerProfile}
              profile={trainerProfile}
              stats={trainerStats}
            />
          ) : null}

          {!trainerCardOpen && phase === 'landing' ? (
            <Landing
              catalogStatus={catalogState.status}
              dailyDate={dailyDate}
              dailyResult={dailyResult}
              dailyResultSaved={dailyResultSaved}
              dailyStreak={dailyDate === getUtcDate() ? dailyStreak : 0}
              onOpenTrainerCard={openTrainerCard}
              onOpenSettings={() => openSettings('training')}
              onRetryCatalog={catalogState.retry}
              onStart={startCustomGame}
              onStartDaily={startDailyGame}
              storageAvailable={storageAvailable}
            />
          ) : null}

          {!trainerCardOpen && session.phase === 'questions' && question ? (
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
              onAnswerRecorded={recordAnswer}
              onFeedbackStart={pause}
              onNewGame={requestLeaveGame}
              onOpenSettings={() => openSettings('experience')}
              question={question}
              total={session.questions.length}
            />
          ) : null}

          {!trainerCardOpen && session.phase === 'results' ? (
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
              onOpenTrainerCard={openTrainerCard}
              onOpenSettings={() => openSettings('experience')}
              onTrainAgain={trainAgain}
              result={session.result}
              resultSaved={session.resultSaved}
            />
          ) : null}
        </main>

        <UpdatePrompt
          visible={
            phase !== 'questions' &&
            !trainerCardOpen &&
            !settings &&
            !generationPromptOpen
          }
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

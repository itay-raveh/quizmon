import { useCallback, useEffect, useRef, useState } from 'react';
import { SoundProvider } from '@/audio/SoundProvider';
import { Footer } from '@/components/Footer';
import { GenerationPromptDialog } from '@/components/GenerationPromptDialog';
import { Landing } from '@/components/Landing';
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
import { buildQuestions, calculateScore, SCORE_VERSION } from '@/game/game';
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

type Phase = 'landing' | 'questions' | 'results';
interface SettingsState {
  initialTab: SettingsTab;
}

export const App = () => {
  const catalogState = usePokemonCatalog();
  const [modifiers, setModifiers] = usePersistentModifiers();
  const [phase, setPhase] = useState<Phase>('landing');
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [generationPromptOpen, setGenerationPromptOpen] = useState(false);
  const [generationPromptPending, setGenerationPromptPending] = useState(
    shouldShowGenerationPrompt,
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [activeModifiers, setActiveModifiers] = useState<Modifiers>(modifiers);
  const [mode, setMode] = useState<GameMode>({ kind: 'training' });
  const [result, setResult] = useState<GameResult | null>(null);
  const [bestResult, setBestResult] = useState<GameResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [resultSaved, setResultSaved] = useState(true);
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
      setQuestions(nextQuestions);
      setActiveModifiers(nextModifiers);
      setMode(nextMode);
      setResult(null);
      setBestResult(null);
      setIsNewBest(false);
      setResultSaved(true);
      setQuestionIndex(0);
      setAnswers([]);
      reset();
      start();
      setPhase('questions');
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
    setQuestionIndex(0);
    setAnswers([]);
    setPhase('landing');
  }, [pause, reset]);

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
        setActiveModifiers((current) => ({
          ...current,
          soundEnabled: nextModifiers.soundEnabled,
          speedrunMode: nextModifiers.speedrunMode,
        }));
      }
      setSettings(null);
      if (phase === 'questions') start();
    },
    [generationPromptPending, phase, setModifiers, start],
  );

  const answerQuestion = useCallback(
    (answer: AnswerResult) => {
      const nextAnswers = [...answers, answer];
      setAnswers(nextAnswers);

      if (questionIndex === questions.length - 1) {
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
          elapsedSeconds,
          questionCount: questions.length,
          score: calculateScore(nextAnswers),
          scoreVersion: SCORE_VERSION,
        };
        const best = saveResult(mode, nextResult);
        trackGameCompleted(mode, nextResult);
        setResult(nextResult);
        setBestResult(best.best);
        setIsNewBest(best.isNewBest);
        setResultSaved(best.isSaved);
        if (mode.kind === 'daily') {
          setDailyResult(best.best);
          setDailyResultSaved(best.isSaved);
          if (best.isSaved) setDailyStreak(readDailyStreak());
        }
        pause();
        setPhase('results');
      } else {
        setQuestionIndex((current) => current + 1);
      }
    },
    [
      answers,
      catalogState,
      elapsedSeconds,
      mode,
      pause,
      questionIndex,
      questions.length,
    ],
  );

  const question = questions[questionIndex];

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

          {phase === 'questions' && question ? (
            <Question
              key={question.id}
              elapsedMilliseconds={elapsedMilliseconds}
              elapsedSeconds={elapsedSeconds}
              interactionPaused={Boolean(settings)}
              mode={mode}
              speedrunMode={activeModifiers.speedrunMode}
              nextQuestion={questions[questionIndex + 1]}
              number={questionIndex + 1}
              onAnswer={answerQuestion}
              onNewGame={newGame}
              onOpenSettings={() => openSettings('experience')}
              question={question}
              total={questions.length}
            />
          ) : null}

          {phase === 'results' && result && bestResult ? (
            <Results
              bestResult={bestResult}
              dailyStreak={
                mode.kind === 'daily' && mode.date === getUtcDate()
                  ? dailyStreak
                  : 0
              }
              isNewBest={isNewBest}
              mode={mode}
              onNewGame={newGame}
              onOpenSettings={() => openSettings('experience')}
              result={result}
              resultSaved={resultSaved}
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
      </div>
    </SoundProvider>
  );
};

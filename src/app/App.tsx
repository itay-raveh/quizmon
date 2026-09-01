import { useCallback, useState } from 'react';
import { SoundProvider } from '@/audio/SoundProvider';
import { Footer } from '@/components/Footer';
import { Landing } from '@/components/Landing';
import { ModifiersDialog } from '@/components/ModifiersDialog';
import { Question } from '@/components/Question';
import { Results } from '@/components/Results';
import { usePokemonCatalog } from '@/game/catalog';
import {
  buildDailyQuestions,
  getDailyModifiers,
  getUtcDate,
  parseDailyDate,
} from '@/game/daily';
import { buildQuestions, calculateScore } from '@/game/game';
import {
  readDailyResult,
  saveResult,
  usePersistentModifiers,
} from '@/game/storage';
import { useStopwatch } from '@/game/stopwatch';
import type {
  GameMode,
  GameResult,
  Modifiers,
  AnswerResult,
  QuestionData,
} from '@/game/types';

type Phase = 'landing' | 'questions' | 'results';

export const App = () => {
  const catalogState = usePokemonCatalog();
  const [modifiers, setModifiers] = usePersistentModifiers();
  const [phase, setPhase] = useState<Phase>('landing');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [activeModifiers, setActiveModifiers] = useState<Modifiers>(modifiers);
  const [mode, setMode] = useState<GameMode>({ kind: 'training' });
  const [result, setResult] = useState<GameResult | null>(null);
  const [bestResult, setBestResult] = useState<GameResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [dailyDate] = useState(
    () => parseDailyDate(window.location.search) ?? getUtcDate(),
  );
  const [dailyResult, setDailyResult] = useState<GameResult | null>(() =>
    readDailyResult(parseDailyDate(window.location.search) ?? getUtcDate()),
  );
  const { elapsedSeconds, pause, reset, start } = useStopwatch();

  const startGame = (
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
    setQuestionIndex(0);
    setAnswers([]);
    reset();
    start();
    setPhase('questions');
  };

  const startCustomGame = () => {
    if (catalogState.status !== 'ready') return;

    startGame(buildQuestions(catalogState.catalog, modifiers), modifiers, {
      kind: 'training',
    });
  };

  const startDailyGame = () => {
    if (catalogState.status !== 'ready' || dailyResult) return;

    const dailyModifiers = getDailyModifiers(modifiers.soundEnabled);
    startGame(
      buildDailyQuestions(catalogState.catalog, dailyDate),
      dailyModifiers,
      { kind: 'daily', date: dailyDate },
    );
  };

  const newGame = useCallback(() => {
    pause();
    reset();
    setQuestionIndex(0);
    setAnswers([]);
    setPhase('landing');
  }, [pause, reset]);

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
        };
        const best = saveResult(mode, activeModifiers, nextResult);
        setResult(nextResult);
        setBestResult(best.best);
        setIsNewBest(best.isNewBest);
        if (mode.kind === 'daily') setDailyResult(best.best);
        pause();
        setPhase('results');
      } else {
        setQuestionIndex((current) => current + 1);
      }
    },
    [
      activeModifiers,
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
      <div className="app">
        <div className="background" aria-hidden="true" />
        <main>
          {phase === 'landing' ? (
            <Landing
              catalogStatus={catalogState.status}
              dailyDate={dailyDate}
              dailyResult={dailyResult}
              onOpenSettings={() => setSettingsOpen(true)}
              onRetryCatalog={catalogState.retry}
              onStart={startCustomGame}
              onStartDaily={startDailyGame}
            />
          ) : null}

          {phase === 'questions' && question ? (
            <Question
              key={question.id}
              elapsedSeconds={elapsedSeconds}
              mode={mode}
              speedrunMode={activeModifiers.speedrunMode}
              nextQuestion={questions[questionIndex + 1]}
              number={questionIndex + 1}
              onAnswer={answerQuestion}
              onNewGame={newGame}
              question={question}
              total={questions.length}
            />
          ) : null}

          {phase === 'results' && result && bestResult ? (
            <Results
              bestResult={bestResult}
              isNewBest={isNewBest}
              mode={mode}
              onNewGame={newGame}
              result={result}
            />
          ) : null}
        </main>

        <Footer />

        {settingsOpen && catalogState.status === 'ready' ? (
          <ModifiersDialog
            catalog={catalogState.catalog}
            modifiers={modifiers}
            onClose={() => setSettingsOpen(false)}
            onSave={(nextModifiers) => {
              setModifiers(nextModifiers);
              setSettingsOpen(false);
            }}
          />
        ) : null}
      </div>
    </SoundProvider>
  );
};

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
import { saveBestScore, usePersistentModifiers } from '@/game/storage';
import { useStopwatch } from '@/game/stopwatch';
import type {
  GameMode,
  GameResult,
  Modifiers,
  QuestionData,
} from '@/game/types';

type Phase = 'landing' | 'questions' | 'results';

export const App = () => {
  const catalogState = usePokemonCatalog();
  const [modifiers, setModifiers] = usePersistentModifiers();
  const [phase, setPhase] = useState<Phase>('landing');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [activeModifiers, setActiveModifiers] = useState<Modifiers>(modifiers);
  const [mode, setMode] = useState<GameMode>({ kind: 'custom' });
  const [result, setResult] = useState<GameResult | null>(null);
  const [bestResult, setBestResult] = useState<GameResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [dailyDate] = useState(
    () => parseDailyDate(window.location.search) ?? getUtcDate(),
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
    setCorrectCount(0);
    reset();
    start();
    setPhase('questions');
  };

  const startCustomGame = () => {
    if (catalogState.status !== 'ready') return;

    startGame(buildQuestions(catalogState.catalog, modifiers), modifiers, {
      kind: 'custom',
    });
  };

  const startDailyGame = () => {
    if (catalogState.status !== 'ready') return;

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
    setCorrectCount(0);
    setPhase('landing');
  }, [pause, reset]);

  const answerQuestion = useCallback(
    (correct: boolean) => {
      const nextCorrectCount = correct ? correctCount + 1 : correctCount;
      setCorrectCount(nextCorrectCount);

      if (questionIndex === questions.length - 1) {
        const nextResult = {
          correctCount: nextCorrectCount,
          elapsedSeconds,
          questionCount: questions.length,
          score: calculateScore(
            nextCorrectCount,
            questions.length,
            elapsedSeconds,
            activeModifiers,
          ),
        };
        const best = saveBestScore(mode, activeModifiers, nextResult);
        setResult(nextResult);
        setBestResult(best.best);
        setIsNewBest(best.isNewBest);
        pause();
        setPhase('results');
      } else {
        setQuestionIndex((current) => current + 1);
      }
    },
    [
      activeModifiers,
      correctCount,
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
              onOpenSettings={() => setSettingsOpen(true)}
              onRetryCatalog={catalogState.retry}
              onStart={startCustomGame}
              onStartDaily={startDailyGame}
            />
          ) : null}

          {phase === 'questions' && question ? (
            <Question
              key={`${questionIndex}-${question.pokemonName}`}
              elapsedSeconds={elapsedSeconds}
              mode={mode}
              modifiers={activeModifiers}
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
              modifiers={activeModifiers}
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

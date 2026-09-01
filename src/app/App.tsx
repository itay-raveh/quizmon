import { useCallback, useState } from 'react';
import { SoundProvider } from '@/audio/SoundProvider';
import { Footer } from '@/components/Footer';
import { Landing } from '@/components/Landing';
import { ModifiersDialog } from '@/components/ModifiersDialog';
import { Question } from '@/components/Question';
import { Results } from '@/components/Results';
import { usePokemonCatalog } from '@/game/catalog';
import { buildQuestions } from '@/game/game';
import { usePersistentModifiers } from '@/game/storage';
import { useStopwatch } from '@/game/stopwatch';
import type { QuestionData } from '@/game/types';

type Phase = 'landing' | 'questions' | 'results';

export const App = () => {
  const catalogState = usePokemonCatalog();
  const [modifiers, setModifiers] = usePersistentModifiers();
  const [phase, setPhase] = useState<Phase>('landing');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const { elapsedSeconds, pause, reset, start } = useStopwatch();

  const startGame = () => {
    if (catalogState.status !== 'ready') return;

    setQuestions(buildQuestions(catalogState.catalog, modifiers));
    setQuestionIndex(0);
    setCorrectCount(0);
    reset();
    start();
    setPhase('questions');
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
      if (correct) setCorrectCount((current) => current + 1);

      if (questionIndex === questions.length - 1) {
        pause();
        setPhase('results');
      } else {
        setQuestionIndex((current) => current + 1);
      }
    },
    [pause, questionIndex, questions.length],
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
              onOpenSettings={() => setSettingsOpen(true)}
              onRetryCatalog={catalogState.retry}
              onStart={startGame}
            />
          ) : null}

          {phase === 'questions' && question ? (
            <Question
              key={`${questionIndex}-${question.pokemonName}`}
              elapsedSeconds={elapsedSeconds}
              modifiers={modifiers}
              nextQuestion={questions[questionIndex + 1]}
              number={questionIndex + 1}
              onAnswer={answerQuestion}
              onNewGame={newGame}
              question={question}
              total={questions.length}
            />
          ) : null}

          {phase === 'results' ? (
            <Results
              correctCount={correctCount}
              elapsedSeconds={elapsedSeconds}
              modifiers={modifiers}
              onNewGame={newGame}
              questionCount={questions.length}
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

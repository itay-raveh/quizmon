import { useCallback, useState } from 'react';
import pokemonData from './data/pokemon.json';
import { Footer } from './components/Footer';
import { Landing } from './components/Landing';
import { ModifiersDialog } from './components/ModifiersDialog';
import { Question } from './components/Question';
import { Results } from './components/Results';
import { buildQuestions } from './lib/game';
import { usePersistentModifiers } from './lib/storage';
import { useStopwatch } from './lib/stopwatch';
import type { PokemonCatalog } from './lib/types';

type Phase = 'landing' | 'questions' | 'results';

const catalog = pokemonData as PokemonCatalog;

export const App = () => {
  const [modifiers, setModifiers] = usePersistentModifiers();
  const [phase, setPhase] = useState<Phase>('landing');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [questions, setQuestions] = useState(() =>
    buildQuestions(catalog, modifiers),
  );
  const { elapsedSeconds, pause, reset, start } = useStopwatch();

  const startGame = () => {
    setQuestions(buildQuestions(catalog, modifiers));
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
    <div className="app">
      <div className="background" aria-hidden="true" />
      <main>
        {phase === 'landing' ? (
          <Landing
            onOpenSettings={() => setSettingsOpen(true)}
            onStart={startGame}
          />
        ) : null}

        {phase === 'questions' && question ? (
          <Question
            key={`${questionIndex}-${question.pokemonName}`}
            elapsedSeconds={elapsedSeconds}
            modifiers={modifiers}
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

      {settingsOpen ? (
        <ModifiersDialog
          catalog={catalog}
          modifiers={modifiers}
          onClose={() => setSettingsOpen(false)}
          onSave={(nextModifiers) => {
            setModifiers(nextModifiers);
            setSettingsOpen(false);
          }}
        />
      ) : null}
    </div>
  );
};

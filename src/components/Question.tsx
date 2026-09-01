import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDuration, formatPokemonName } from '@/game/game';
import { preloadPokemon, usePokemon } from '@/game/pokemon';
import type { Modifiers, QuestionData } from '@/game/types';
import { GameButton } from './GameButton';
import { Progress } from './Progress';
import { Sprite } from './Sprite';

interface QuestionProps {
  elapsedSeconds: number;
  modifiers: Modifiers;
  nextQuestion?: QuestionData;
  number: number;
  onAnswer: (correct: boolean) => void;
  onNewGame: () => void;
  question: QuestionData;
  total: number;
}

export const Question = ({
  elapsedSeconds,
  modifiers,
  nextQuestion,
  number,
  onAnswer,
  onNewGame,
  question,
  total,
}: QuestionProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const answerTimeout = useRef<number | null>(null);
  const pokemonState = usePokemon(question, modifiers.randomSprite);

  useEffect(() => {
    return () => {
      if (answerTimeout.current !== null) {
        window.clearTimeout(answerTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pokemonState.status === 'ready' && nextQuestion) {
      preloadPokemon(nextQuestion, modifiers.randomSprite);
    }
  }, [modifiers.randomSprite, nextQuestion, pokemonState.status]);

  const selectOption = useCallback(
    (option: string) => {
      if (selectedOption) return;

      const correct = option === question.pokemonName;
      const delay = modifiers.speedrunMode ? 50 : correct ? 750 : 1750;
      setSelectedOption(option);
      answerTimeout.current = window.setTimeout(() => onAnswer(correct), delay);
    },
    [modifiers.speedrunMode, onAnswer, question.pokemonName, selectedOption],
  );

  useEffect(() => {
    const answerWithKeyboard = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat)
        return;
      const index = Number(event.key) - 1;
      const option = question.options[index];
      if (option) selectOption(option);
    };

    window.addEventListener('keydown', answerWithKeyboard);
    return () => window.removeEventListener('keydown', answerWithKeyboard);
  }, [question.options, selectOption]);

  const optionClassName = (option: string) => {
    if (!selectedOption) return 'answer';
    if (option === question.pokemonName) return 'answer answer--correct';
    if (option === selectedOption) return 'answer answer--wrong';
    return 'answer answer--muted';
  };

  return (
    <section className="question" aria-labelledby="question-title">
      <div className="question__topline">
        <Progress current={number} total={total} />
        <span
          className="timer"
          aria-label={`Elapsed time ${formatDuration(elapsedSeconds)}`}
        >
          {formatDuration(elapsedSeconds)}
        </span>
      </div>

      <h1 id="question-title">Who’s that Pokémon?</h1>

      {pokemonState.status === 'loading' ? (
        <div className="sprite-loader" role="status">
          Loading Pokémon…
        </div>
      ) : null}

      {pokemonState.status === 'error' ? (
        <div className="question-error" role="alert">
          <p>That Pokémon could not be loaded.</p>
          <div className="question-error__actions">
            <GameButton onClick={pokemonState.retry}>Try again</GameButton>
            <GameButton tone="quiet" onClick={onNewGame}>
              New game
            </GameButton>
          </div>
        </div>
      ) : null}

      {pokemonState.status === 'ready' ? (
        <Sprite
          silhouette={modifiers.whosThatPokemon}
          sprite={pokemonState.sprite}
        />
      ) : null}

      <div className="answers">
        {question.options.map((option, index) => (
          <GameButton
            aria-keyshortcuts={String(index + 1)}
            className={optionClassName(option)}
            disabled={
              Boolean(selectedOption) || pokemonState.status !== 'ready'
            }
            key={option}
            onClick={() => selectOption(option)}
          >
            <kbd aria-hidden="true">{index + 1}</kbd>
            <span>{formatPokemonName(option)}</span>
          </GameButton>
        ))}
      </div>

      <p className="answer-feedback" aria-live="polite">
        {selectedOption === question.pokemonName
          ? 'Correct!'
          : selectedOption
            ? `It was ${formatPokemonName(question.pokemonName)}.`
            : '\u00a0'}
      </p>

      <GameButton className="new-game" tone="quiet" onClick={onNewGame}>
        New game
      </GameButton>
    </section>
  );
};

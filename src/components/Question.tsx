import { useEffect, useRef, useState } from 'react';
import { formatDuration, formatPokemonName } from '@/lib/game';
import { usePokemon } from '@/lib/pokemon';
import type { Modifiers, QuestionData } from '@/lib/types';
import { GameButton } from './GameButton';
import { Progress } from './Progress';
import { Sprite } from './Sprite';

interface QuestionProps {
  elapsedSeconds: number;
  modifiers: Modifiers;
  number: number;
  onAnswer: (correct: boolean) => void;
  onNewGame: () => void;
  question: QuestionData;
  total: number;
}

export const Question = ({
  elapsedSeconds,
  modifiers,
  number,
  onAnswer,
  onNewGame,
  question,
  total,
}: QuestionProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const answerTimeout = useRef<number | null>(null);
  const pokemonState = usePokemon(question.pokemonName);

  useEffect(() => {
    return () => {
      if (answerTimeout.current !== null) {
        window.clearTimeout(answerTimeout.current);
      }
    };
  }, []);

  const selectOption = (option: string) => {
    if (selectedOption) return;

    const correct = option === question.pokemonName;
    const delay = modifiers.speedrunMode ? 50 : correct ? 750 : 1750;
    setSelectedOption(option);
    answerTimeout.current = window.setTimeout(() => onAnswer(correct), delay);
  };

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
          pokemon={pokemonState.pokemon}
          random={modifiers.randomSprite}
          silhouette={modifiers.whosThatPokemon}
        />
      ) : null}

      <div className="answers">
        {question.options.map((option) => (
          <GameButton
            className={optionClassName(option)}
            disabled={
              Boolean(selectedOption) || pokemonState.status !== 'ready'
            }
            key={option}
            onClick={() => selectOption(option)}
          >
            {formatPokemonName(option)}
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

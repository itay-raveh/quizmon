import { QuestionIdentity, QuestionSprite } from './QuestionEntity';
import {
  isVisible,
  spriteState,
  type EntityRendering,
} from '@/domain/quiz/question-rendering';
import { PokemonSearch } from '@/components/PokemonSearch';
import type { PokemonSearchOption } from '@/domain/quiz/types';
import { useMemo, useState } from 'react';

interface ChampionSearchProps {
  answerKind?: 'pokemon' | 'ability' | 'item' | 'tm';
  policy: EntityRendering;
  cluesShown: number;
  answered: boolean;
  correctOption: string;
  disabled: boolean;
  onAnswer: (option: string) => void;
  options: readonly PokemonSearchOption[];
  selectedOption?: string;
}

export const ChampionSearch = ({
  answerKind = 'pokemon',
  policy,
  cluesShown,
  answered,
  correctOption,
  disabled,
  onAnswer,
  options,
  selectedOption,
}: ChampionSearchProps) => {
  const [query, setQuery] = useState('');
  const searchOptions = useMemo(
    () =>
      options.map(({ name, label, dexNumber, sprite }) => ({
        name,
        label,
        dexNumber: isVisible(policy.number, { answered, cluesShown })
          ? dexNumber
          : undefined,
        sprite: spriteState(policy.sprite, { answered, cluesShown }).visible
          ? sprite
          : undefined,
      })),
    [policy, answered, cluesShown, options],
  );
  const result = answered
    ? selectedOption === correctOption
      ? 'correct'
      : 'wrong'
    : null;

  return (
    <PokemonSearch
      disabled={disabled || answered}
      mode="champion"
      renderPokemon={
        answerKind !== 'pokemon'
          ? undefined
          : (pokemon) => (
              <>
                {pokemon.sprite ? (
                  <span className="pokemon-picker__sprite" aria-hidden="true">
                    <QuestionSprite
                      src={pokemon.sprite}
                      rule={policy.sprite}
                      state={{ answered, cluesShown }}
                    />
                  </span>
                ) : null}
                <QuestionIdentity
                  name={pokemon.name}
                  dexNumber={pokemon.dexNumber}
                  policy={policy}
                  state={{ answered, cluesShown }}
                  hideNumberFromAccessibility
                />
              </>
            )
      }
      onConfirm={onAnswer}
      searchSubject={
        answerKind === 'pokemon'
          ? 'Pokémon'
          : answerKind === 'tm'
            ? 'TM'
            : answerKind
      }
      onQueryChange={setQuery}
      options={searchOptions}
      query={query}
      result={result}
    />
  );
};

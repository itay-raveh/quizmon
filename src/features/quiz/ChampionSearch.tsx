import { ItemRenderable, PokemonRenderable } from './QuestionEntity';
import {
  isVisible,
  spriteState,
  type QuestionRendering,
} from '@/domain/quiz/rendering';
import { PokemonSearch } from '@/components/PokemonSearch';
import { formatPokemonName } from '@/domain/pokemon/format';
import type { PokemonSearchOption } from '@/domain/quiz/types';
import { useMemo, useState } from 'react';

interface ChampionSearchProps {
  answerKind?: 'pokemon' | 'ability' | 'item' | 'tm';
  policy: QuestionRendering['search'];
  cluesShown: number;
  answered: boolean;
  correctOption: string;
  disabled: boolean;
  onAnswer: (option: string) => void;
  options: readonly PokemonSearchOption[];
  selectedOption?: string;
  showCorrectAnswerBanner: boolean;
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
  showCorrectAnswerBanner,
}: ChampionSearchProps) => {
  const [query, setQuery] = useState('');
  const searchOptions = useMemo(
    () =>
      options.map(({ name, label, dexNumber, sprite, types }) => ({
        name,
        label,
        types,
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

  const correctLabel =
    options.find(({ name }) => name === correctOption)?.label ??
    formatPokemonName(correctOption);

  return (
    <>
      <PokemonSearch
        disabled={disabled || answered}
        mode="champion"
        renderPokemon={
          answerKind === 'pokemon'
            ? (pokemon) => (
                <PokemonRenderable
                  name={pokemon.name}
                  dexNumber={pokemon.dexNumber}
                  src={pokemon.sprite}
                  types={pokemon.types}
                  policy={policy}
                  state={{ answered, cluesShown }}
                  spriteSlotClassName="pokemon-picker__sprite"
                  typesClassName="pokemon-picker__types"
                  hideNumberFromAccessibility
                />
              )
            : answerKind === 'item' || answerKind === 'tm'
              ? (item) => (
                  <ItemRenderable
                    name={item.label ?? formatPokemonName(item.name)}
                    src={item.sprite}
                    policy={policy}
                    state={{ answered, cluesShown }}
                    className="item-renderable"
                    spriteClassName="item-renderable__sprite"
                  />
                )
              : undefined
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
      {result === 'wrong' && showCorrectAnswerBanner && (
        <p className="champion-search__answer">
          Correct answer: <strong>{correctLabel}</strong>
        </p>
      )}
    </>
  );
};

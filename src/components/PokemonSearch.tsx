import { Form } from '@base-ui/react/form';
import { PokemonRenderable } from './PokemonRenderable';
import { baseQuestionRendering } from '@/domain/quiz/question-rules/shared';
import type { QuestionRendering, RevealState } from '@/domain/quiz/rendering';
import {
  createPokemonSearchEntry,
  createSearch,
  normalizeSearch,
} from '@/domain/pokemon/search';
import { SearchCombobox } from './SearchCombobox';
import { useInteractionSound } from '@/lib/audio/sound-context';
import { useId, useMemo, type ReactNode } from 'react';
import { GameButton } from './GameButton';

interface SearchPokemon {
  name: string;
  label?: string;
  dexNumber?: number;
  sprite?: string | null;
  types?: string[];
}
interface PokemonSearchProps {
  searchSubject?: 'Pokémon' | 'ability' | 'item' | 'TM';
  renderPokemon?: (pokemon: SearchPokemon) => ReactNode;
  rendering?: QuestionRendering['search'];
  state?: RevealState;
  disabled?: boolean;
  mode: 'partner' | 'champion';
  onClear?: () => void;
  onConfirm: (name: string) => void;
  onQueryChange: (query: string) => void;
  options: readonly SearchPokemon[];
  query: string;
  result?: 'correct' | 'wrong' | null;
}

export const PokemonSearch = ({
  searchSubject = 'Pokémon',
  renderPokemon,
  rendering = baseQuestionRendering.search,
  state = { answered: false, cluesShown: 0 },
  disabled = false,
  mode,
  onClear,
  onConfirm,
  onQueryChange,
  options,
  query,
  result,
}: PokemonSearchProps) => {
  const listboxId = useId();
  const playInteractionSound = useInteractionSound();
  const champion = mode === 'champion';
  const className = champion ? 'champion-search' : 'pokemon-picker';
  const Root = champion ? Form : 'div';
  const entries = useMemo(
    () => options.map(createPokemonSearchEntry),
    [options],
  );
  const search = useMemo(() => createSearch(entries), [entries]);
  const normalizedQuery = normalizeSearch(query);
  const exactMatch = entries.find(
    ({ normalized, aliases }) =>
      normalized === normalizedQuery || aliases.includes(normalizedQuery),
  );
  const suggestions = useMemo(
    () => (champion && exactMatch ? [] : search(normalizedQuery)),
    [champion, search, exactMatch, normalizedQuery],
  );

  return (
    <Root
      className={`${className} ${result ? `${className}--${result}` : ''}`.trim()}
      onSubmit={
        champion
          ? (event) => {
              event.preventDefault();
              if (!disabled && exactMatch) onConfirm(exactMatch.name);
            }
          : undefined
      }
    >
      <label id={`${listboxId}-label`} htmlFor={`${listboxId}-input`}>
        {champion ? 'Your answer' : 'Partner Pokémon'}
      </label>
      <div className={`${className}__controls`}>
        <SearchCombobox
          id={listboxId}
          autoFocus={champion}
          descriptionId={
            champion ? 'question-title question-prompt' : undefined
          }
          className={`${className}__${champion ? 'combobox' : 'field'}`}
          query={query}
          suggestions={suggestions}
          disabled={disabled}
          invalid={result === 'wrong'}
          hideSuggestions={Boolean(champion && exactMatch) || !normalizedQuery}
          onQueryChange={(value) => {
            onQueryChange(value);
            onClear?.();
          }}
          onChoose={(suggestion) => {
            playInteractionSound(champion ? 'tap' : 'toggle-on');
            onQueryChange(suggestion.label);
            if (!champion) onConfirm(suggestion.name);
          }}
          getKey={(suggestion) => suggestion.name}
          getLabel={(suggestion) => suggestion.label}
          placeholder={
            champion
              ? searchSubject === 'TM'
                ? 'Type a TM number'
                : `Type ${searchSubject === 'Pokémon' ? 'a Pokémon' : `an ${searchSubject}`} name`
              : 'Search all Pokémon'
          }
          emptyMessage={`No ${searchSubject === 'ability' ? 'abilities' : searchSubject === 'item' ? 'items' : searchSubject === 'TM' ? 'TMs' : 'Pokémon'} found. Try another spelling.`}
          renderOption={(suggestion) =>
            renderPokemon ? (
              renderPokemon(suggestion)
            ) : (
              <PokemonRenderable
                name={suggestion.label}
                dexNumber={suggestion.dexNumber}
                src={suggestion.sprite}
                types={suggestion.types}
                policy={rendering}
                state={state}
                spriteSlotClassName="search-combobox__sprite"
                typesClassName="pokemon-picker__types"
                hideNumberFromAccessibility={champion}
              />
            )
          }
        />
        {champion ? (
          <GameButton
            disabled={disabled || !exactMatch}
            sound="none"
            type="submit"
          >
            Guess
          </GameButton>
        ) : null}
      </div>
    </Root>
  );
};

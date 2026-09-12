import { formatPokedexNumber } from '@/domain/pokemon/format';
import {
  createPokemonSearchEntry,
  createSearch,
  normalizeSearch,
} from '@/domain/pokemon/search';
import { SearchCombobox } from './SearchCombobox';
import { useInteractionSound } from '@/lib/audio/sound-context';
import { useId, useMemo } from 'react';
import { GameButton } from './GameButton';

interface PokemonSearchProps {
  disabled?: boolean;
  mode: 'partner' | 'champion';
  onClear?: () => void;
  onConfirm: (name: string) => void;
  onQueryChange: (query: string) => void;
  options: readonly {
    name: string;
    dexNumber?: number;
    sprite?: string | null;
  }[];
  query: string;
  result?: 'correct' | 'wrong' | null;
}

export const PokemonSearch = ({
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
  const Root = champion ? 'form' : 'div';
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
      <label htmlFor={`${listboxId}-input`}>
        {champion ? 'Your answer' : 'Partner Pokémon'}
      </label>
      <div className={`${className}__controls`}>
        <SearchCombobox
          id={listboxId}
          className={`${className}__${champion ? 'combobox' : 'field'}`}
          emptyClassName={`${className}__empty`}
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
          placeholder={champion ? 'Type a Pokémon name' : 'Search all Pokémon'}
          emptyMessage="No Pokémon found"
          renderOption={(suggestion) => (
            <>
              {!champion ? (
                <span aria-hidden="true" className="pokemon-picker__sprite">
                  {suggestion.sprite ? (
                    <img
                      alt=""
                      decoding="async"
                      height="32"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                      src={suggestion.sprite}
                      width="32"
                    />
                  ) : null}
                </span>
              ) : null}
              <span>{suggestion.label}</span>
              {champion && suggestion.dexNumber !== undefined ? (
                <small aria-hidden="true">
                  {formatPokedexNumber(suggestion.dexNumber)}
                </small>
              ) : null}
            </>
          )}
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

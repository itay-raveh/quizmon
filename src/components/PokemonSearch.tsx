import { formatPokedexNumber } from '@/domain/pokemon/format';
import {
  createPokemonSearchEntry,
  findSearchMatches,
  normalizeSearch,
} from '@/domain/pokemon/search';
import { useSuggestionNavigation } from '@/hooks/useSuggestionNavigation';
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
  const normalizedQuery = normalizeSearch(query);
  const exactMatch = entries.find(
    ({ normalized, aliases }) =>
      normalized === normalizedQuery || aliases.includes(normalizedQuery),
  );
  const suggestions = useMemo(
    () =>
      champion && exactMatch ? [] : findSearchMatches(entries, normalizedQuery),
    [champion, entries, exactMatch, normalizedQuery],
  );
  const {
    activeIndex,
    activeOptionRef,
    choose,
    handleKeyDown,
    open,
    resetActiveIndex,
    setOpen,
  } = useSuggestionNavigation(suggestions, (suggestion) => {
    playInteractionSound(champion ? 'tap' : 'toggle-on');
    onQueryChange(suggestion.label);
    if (!champion) onConfirm(suggestion.name);
  });
  const showSuggestions =
    open &&
    !disabled &&
    !(champion && exactMatch) &&
    normalizedQuery.length > 0;
  const expanded = showSuggestions && suggestions.length > 0;

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
        <div className={`${className}__${champion ? 'combobox' : 'field'}`}>
          <input
            aria-activedescendant={
              expanded && activeIndex >= 0
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={expanded ? listboxId : undefined}
            aria-expanded={expanded}
            aria-invalid={result === 'wrong' ? true : undefined}
            autoCapitalize="none"
            autoComplete="off"
            disabled={disabled}
            id={`${listboxId}-input`}
            onBlur={() => setOpen(false)}
            onChange={(event) => {
              onQueryChange(event.target.value);
              resetActiveIndex();
              setOpen(true);
              onClear?.();
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              champion ? 'Type a Pokémon name' : 'Search all Pokémon'
            }
            role="combobox"
            spellCheck={false}
            type="text"
            value={query}
          />
          {showSuggestions ? (
            suggestions.length > 0 ? (
              <ul id={listboxId} role="listbox">
                {suggestions.map((suggestion, index) => (
                  <li
                    aria-selected={index === activeIndex}
                    id={`${listboxId}-option-${index}`}
                    key={suggestion.name}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(suggestion)}
                    ref={index === activeIndex ? activeOptionRef : undefined}
                    role="option"
                  >
                    {!champion ? (
                      <span
                        aria-hidden="true"
                        className="pokemon-picker__sprite"
                      >
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
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`${className}__empty`} role="status">
                No Pokémon found
              </p>
            )
          ) : null}
        </div>
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

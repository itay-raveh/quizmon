import { useId, useMemo, useState, type SubmitEvent } from 'react';
import { useInteractionSound } from '@/audio/sound';
import { formatPokedexNumber, formatPokemonName } from '@/game/format';
import { findSearchMatches, normalizeSearch } from '@/game/search';
import { useSuggestionNavigation } from './useSuggestionNavigation';
import type { PokemonSearchOption } from '@/game/types';
import { GameButton } from './GameButton';

interface ChampionSearchProps {
  answered: boolean;
  correctOption: string;
  disabled: boolean;
  onAnswer: (option: string) => void;
  options: readonly PokemonSearchOption[];
  selectedOption?: string;
}

export const ChampionSearch = ({
  answered,
  correctOption,
  disabled,
  onAnswer,
  options,
  selectedOption,
}: ChampionSearchProps) => {
  const listboxId = useId();
  const playInteractionSound = useInteractionSound();
  const [query, setQuery] = useState('');
  const entries = useMemo(
    () =>
      options.map(({ dexNumber, name }) => {
        const label = formatPokemonName(name);
        return {
          dexNumber,
          label,
          normalized: normalizeSearch(label),
          option: name,
        };
      }),
    [options],
  );
  const normalizedQuery = normalizeSearch(query);
  const exactMatch = entries.find(
    ({ normalized }) => normalized === normalizedQuery,
  );
  const suggestions = useMemo(() => {
    if (exactMatch) return [];
    return findSearchMatches(entries, normalizedQuery);
  }, [entries, exactMatch, normalizedQuery]);
  const {
    activeIndex,
    choose,
    handleKeyDown,
    open,
    resetActiveIndex,
    setOpen,
  } = useSuggestionNavigation(suggestions, (suggestion) => {
    playInteractionSound('tap');
    setQuery(suggestion.label);
  });
  const showSuggestions =
    open && !answered && !exactMatch && normalizedQuery.length > 0;
  const result = answered
    ? selectedOption === correctOption
      ? 'correct'
      : 'wrong'
    : null;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disabled && !answered && exactMatch) onAnswer(exactMatch.option);
  };

  return (
    <form
      className={`champion-search ${result ? `champion-search--${result}` : ''}`.trim()}
      onSubmit={handleSubmit}
    >
      <label htmlFor={`${listboxId}-input`}>Your answer</label>
      <div className="champion-search__controls">
        <div className="champion-search__combobox">
          <input
            aria-activedescendant={
              activeIndex >= 0
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={
              showSuggestions && suggestions.length > 0 ? listboxId : undefined
            }
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-invalid={result === 'wrong' ? true : undefined}
            autoCapitalize="none"
            autoComplete="off"
            disabled={disabled || answered}
            id={`${listboxId}-input`}
            onBlur={() => setOpen(false)}
            onChange={(event) => {
              setQuery(event.target.value);
              resetActiveIndex();
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Type a Pokémon name"
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
                    key={suggestion.option}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => choose(suggestion)}
                    role="option"
                  >
                    <span>{suggestion.label}</span>
                    <small aria-hidden="true">
                      {formatPokedexNumber(suggestion.dexNumber)}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="champion-search__empty" role="status">
                No Pokémon found
              </p>
            )
          ) : null}
        </div>

        <GameButton
          disabled={disabled || answered || !exactMatch}
          sound="none"
          type="submit"
        >
          Guess
        </GameButton>
      </div>
    </form>
  );
};

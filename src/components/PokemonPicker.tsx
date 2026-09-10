import { useUpdateState } from '@/pwa/update-state';
import { useId, useMemo } from 'react';
import { useInteractionSound } from '@/audio/sound';
import { formatPokemonName } from '@/game/format';
import {
  createPokemonSearchEntry,
  findSearchMatches,
  normalizeSearch,
} from '@/game/search';
import { useSuggestionNavigation } from './useSuggestionNavigation';

interface PokemonPickerProps {
  onChange: (pokemon: string | null) => void;
  options: readonly {
    name: string;
    sprite: string | null;
  }[];
  value: string | null;
}

export const PokemonPicker = ({
  onChange,
  options,
  value,
}: PokemonPickerProps) => {
  const listboxId = useId();
  const playInteractionSound = useInteractionSound();
  const [query, setQuery] = useUpdateState(
    'partner-query',
    value ? formatPokemonName(value) : '',
  );
  const entries = useMemo(
    () => options.map(createPokemonSearchEntry),
    [options],
  );
  const normalizedQuery = normalizeSearch(query);
  const suggestions = useMemo(
    () => findSearchMatches(entries, normalizedQuery),
    [entries, normalizedQuery],
  );
  const {
    activeIndex,
    choose,
    handleKeyDown,
    open,
    resetActiveIndex,
    setOpen,
  } = useSuggestionNavigation(suggestions, (suggestion) => {
    playInteractionSound('toggle-on');
    setQuery(suggestion.label);
    onChange(suggestion.name);
  });
  const showSuggestions = open && normalizedQuery.length > 0;

  return (
    <div className="pokemon-picker">
      <label htmlFor={`${listboxId}-input`}>Partner Pokémon</label>
      <div className="pokemon-picker__field">
        <input
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showSuggestions}
          autoCapitalize="none"
          autoComplete="off"
          id={`${listboxId}-input`}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            resetActiveIndex();
            setOpen(true);
            onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search all Pokémon"
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
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => choose(suggestion)}
                  role="option"
                >
                  <span aria-hidden="true" className="pokemon-picker__sprite">
                    {suggestion.sprite ? (
                      <img
                        alt=""
                        decoding="async"
                        height="32"
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                        }}
                        src={suggestion.sprite}
                        width="32"
                      />
                    ) : null}
                  </span>
                  <span>{suggestion.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pokemon-picker__empty" role="status">
              No Pokémon found
            </p>
          )
        ) : null}
      </div>
    </div>
  );
};

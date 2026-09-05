import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { formatPokemonName } from '@/game/format';
import { findSearchMatches, normalizeSearch } from '@/game/search';

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
  const [query, setQuery] = useState(value ? formatPokemonName(value) : '');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const entries = useMemo(
    () =>
      options.map(({ name, sprite }) => ({
        label: formatPokemonName(name),
        normalized: normalizeSearch(name),
        name,
        sprite,
      })),
    [options],
  );
  const normalizedQuery = normalizeSearch(query);
  const suggestions = useMemo(() => {
    return findSearchMatches(entries, query);
  }, [entries, query]);
  const showSuggestions = open && normalizedQuery.length > 0;

  const choose = (name: string, label: string) => {
    setQuery(label);
    setOpen(false);
    setActiveIndex(-1);
    onChange(name);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    } else if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
    } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      const suggestion = suggestions[activeIndex];
      if (suggestion) {
        event.preventDefault();
        choose(suggestion.name, suggestion.label);
      }
    }
  };

  const handlePointerDown = (
    event: PointerEvent<HTMLLIElement>,
    name: string,
    label: string,
  ) => {
    event.preventDefault();
    choose(name, label);
  };

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
            setActiveIndex(-1);
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
                  onPointerDown={(event) =>
                    handlePointerDown(event, suggestion.name, suggestion.label)
                  }
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

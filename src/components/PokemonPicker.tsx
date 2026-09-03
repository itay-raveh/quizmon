import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { formatPokemonName } from '@/game/format';

interface PokemonPickerProps {
  onChange: (pokemon: string | null) => void;
  options: readonly string[];
  value: string | null;
}

const normalizeSearch = (value: string): string =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

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
      options.map((option) => ({
        label: formatPokemonName(option),
        normalized: normalizeSearch(option),
        option,
      })),
    [options],
  );
  const normalizedQuery = normalizeSearch(query);
  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return entries
      .filter(({ normalized }) => normalized.includes(normalizedQuery))
      .sort((left, right) => {
        const leftStarts = left.normalized.startsWith(normalizedQuery);
        const rightStarts = right.normalized.startsWith(normalizedQuery);
        if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
        return left.label.localeCompare(right.label);
      })
      .slice(0, 6);
  }, [entries, normalizedQuery]);
  const showSuggestions = open && normalizedQuery.length > 0;

  const choose = (option: string, label: string) => {
    setQuery(label);
    setOpen(false);
    setActiveIndex(-1);
    onChange(option);
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
        choose(suggestion.option, suggestion.label);
      }
    }
  };

  const handlePointerDown = (
    event: PointerEvent<HTMLLIElement>,
    option: string,
    label: string,
  ) => {
    event.preventDefault();
    choose(option, label);
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
                  key={suggestion.option}
                  onPointerDown={(event) =>
                    handlePointerDown(
                      event,
                      suggestion.option,
                      suggestion.label,
                    )
                  }
                  role="option"
                >
                  {suggestion.label}
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

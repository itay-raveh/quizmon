import {
  useId,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { formatPokemonName } from '@/game/game';
import { GameButton } from './GameButton';

interface ChampionSearchProps {
  answered: boolean;
  correctOption: string;
  disabled: boolean;
  onAnswer: (option: string) => void;
  options: readonly string[];
  selectedOption?: string;
}

const normalizeSearch = (value: string): string =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

export const ChampionSearch = ({
  answered,
  correctOption,
  disabled,
  onAnswer,
  options,
  selectedOption,
}: ChampionSearchProps) => {
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const entries = useMemo(
    () =>
      options.map((option) => {
        const label = formatPokemonName(option);
        return { label, normalized: normalizeSearch(label), option };
      }),
    [options],
  );
  const normalizedQuery = normalizeSearch(query);
  const exactMatch = entries.find(
    ({ normalized }) => normalized === normalizedQuery,
  );
  const suggestions = useMemo(() => {
    if (!normalizedQuery || exactMatch) return [];

    return entries
      .filter(({ normalized }) => normalized.includes(normalizedQuery))
      .sort((left, right) => {
        const leftStarts = left.normalized.startsWith(normalizedQuery);
        const rightStarts = right.normalized.startsWith(normalizedQuery);
        if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
        return left.label.localeCompare(right.label);
      })
      .slice(0, 6);
  }, [entries, exactMatch, normalizedQuery]);
  const showSuggestions = open && !answered && normalizedQuery.length > 0;
  const result = answered
    ? selectedOption === correctOption
      ? 'correct'
      : 'wrong'
    : null;

  const chooseSuggestion = (option: string, label: string) => {
    setQuery(label);
    setActiveIndex(-1);
    setOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disabled && !answered && exactMatch) onAnswer(exactMatch.option);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
      return;
    }
    if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      const suggestion = suggestions[activeIndex];
      if (suggestion) {
        event.preventDefault();
        chooseSuggestion(suggestion.option, suggestion.label);
      }
    }
  };

  const handleSuggestionPointerDown = (
    event: PointerEvent<HTMLLIElement>,
    option: string,
    label: string,
  ) => {
    event.preventDefault();
    chooseSuggestion(option, label);
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
            aria-controls={listboxId}
            aria-expanded={showSuggestions}
            aria-invalid={result === 'wrong' ? true : undefined}
            autoCapitalize="none"
            autoComplete="off"
            disabled={disabled || answered}
            id={`${listboxId}-input`}
            onBlur={() => setOpen(false)}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
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
                    onPointerDown={(event) =>
                      handleSuggestionPointerDown(
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
              <p className="champion-search__empty" role="status">
                No Pokémon found
              </p>
            )
          ) : null}
        </div>

        <GameButton
          clickSound="none"
          disabled={disabled || answered || !exactMatch}
          type="submit"
        >
          Guess
        </GameButton>
      </div>
    </form>
  );
};

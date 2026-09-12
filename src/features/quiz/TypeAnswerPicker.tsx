import { TypeBadges } from '@/components/TypeBadge';
import { CheckIcon, MinusIcon, XIcon } from '@/components/icons';
import { formatPokemonName } from '@/domain/pokemon/format';
import { normalizeSearch } from '@/domain/pokemon/search';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import type { QuestionData } from '@/domain/quiz/types';
import { useSuggestionNavigation } from '@/hooks/useSuggestionNavigation';
import { useId, useRef, useState } from 'react';
import { AnswerEffectiveness } from './AnswerEffectiveness';

export const TypeAnswerPicker = ({
  question,
  selectedOptions,
  answered,
  onSelect,
  typeRelations,
}: {
  question: QuestionData;
  selectedOptions: readonly string[];
  answered: boolean;
  onSelect: (type: string) => void;
  typeRelations?: PokemonCatalog['typeRelations'];
}) => {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const normalized = normalizeSearch(query);
  const suggestions = question.options.filter(
    (type) =>
      normalized.length > 0 &&
      !selectedOptions.includes(type) &&
      type.includes(normalized),
  );
  const navigation = useSuggestionNavigation(suggestions, (type) => {
    onSelect(type);
    setQuery('');
    input.current?.focus();
  });
  const showSuggestions = navigation.open && normalized.length > 0;
  const expanded = showSuggestions && suggestions.length > 0;

  if (answered) {
    const visible = question.options.filter(
      (type) =>
        selectedOptions.includes(type) ||
        question.answer.correctOptions.includes(type),
    );
    return (
      <div
        className="type-picker__results"
        role="list"
        aria-label="Type answers"
      >
        {visible.map((type) => {
          const correct = question.answer.correctOptions.includes(type);
          const status = !correct
            ? 'Wrong pick'
            : selectedOptions.includes(type)
              ? 'Correct'
              : 'Missed';
          return (
            <div
              className={`type-picker__result type-picker__result--${!correct ? 'wrong' : selectedOptions.includes(type) ? 'correct' : 'missed'}`}
              role="listitem"
              key={type}
            >
              <TypeBadges types={[type]} label={formatPokemonName(type)} />
              <span className="visually-hidden">{status}</span>
              {status === 'Missed' ? (
                <MinusIcon aria-hidden="true" weight="bold" />
              ) : correct ? (
                <CheckIcon aria-hidden="true" weight="bold" />
              ) : (
                <XIcon aria-hidden="true" weight="bold" />
              )}
              {question.questionType === 'type-matchup' && typeRelations ? (
                <AnswerEffectiveness
                  option={type}
                  isTypeOption
                  attackTypes={[type]}
                  defenderTypes={question.pokemonTypes}
                  typeRelations={typeRelations}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="type-picker champion-search">
      <label htmlFor={`${id}-input`}>Your types</label>
      <div className="type-picker__field">
        <input
          ref={input}
          id={`${id}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? id : undefined}
          aria-activedescendant={
            expanded && navigation.activeIndex >= 0
              ? `${id}-${navigation.activeIndex}`
              : undefined
          }
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Add a type…"
          value={query}
          onFocus={() => navigation.setOpen(true)}
          onBlur={() => navigation.setOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            navigation.resetActiveIndex();
            navigation.setOpen(true);
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              navigation.open &&
              navigation.activeIndex < 0 &&
              suggestions.includes(normalized)
            ) {
              event.preventDefault();
              navigation.choose(normalized);
            } else navigation.handleKeyDown(event);
          }}
        />
        {showSuggestions ? (
          suggestions.length ? (
            <ul id={id} role="listbox" aria-label="Matching types">
              {suggestions.map((type, index) => (
                <li
                  key={type}
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={index === navigation.activeIndex}
                  ref={
                    index === navigation.activeIndex
                      ? navigation.activeOptionRef
                      : undefined
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => navigation.choose(type)}
                >
                  <span>{formatPokemonName(type)}</span>
                  <TypeBadges types={[type]} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="champion-search__empty" role="status">
              {selectedOptions.includes(normalized)
                ? 'Already selected'
                : 'No matching types'}
            </p>
          )
        ) : null}
      </div>
      <div
        className="type-picker__selected"
        role="group"
        aria-label="Selected types"
      >
        {selectedOptions.map((type) => (
          <button
            type="button"
            className="type-picker__remove"
            key={type}
            aria-label={`Remove ${formatPokemonName(type)}`}
            onClick={() => {
              onSelect(type);
              navigation.resetActiveIndex();
              input.current?.focus();
            }}
          >
            <TypeBadges types={[type]} />
            <XIcon aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
};

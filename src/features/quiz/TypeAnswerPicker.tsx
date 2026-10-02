import * as styles from './styles/classes.css.ts';
import { TypeBadges } from '@/components/TypeBadge';
import { CheckIcon, MinusIcon, XIcon } from '@/components/icons';
import { formatPokemonName } from '@/domain/pokemon/format';
import { createSearch, normalizeSearch } from '@/domain/pokemon/search';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import type { QuestionData } from '@/domain/quiz/types';
import { SearchCombobox } from '@/components/SearchCombobox';
import { useId, useMemo, useRef, useState } from 'react';
import { AnswerEffectiveness } from './AnswerEffectiveness';
import { answerOptionState } from './answer-option-state';
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
  const multiSelect = question.answer.interaction === 'multi-select';
  const normalized = normalizeSearch(query);
  const search = useMemo(
    () =>
      createSearch(
        question.options.map((type) => ({
          name: type,
          label: formatPokemonName(type),
          normalized: normalizeSearch(type),
        })),
      ),
    [question.options],
  );
  const suggestions = search(query)
    .map(({ name }) => name)
    .filter((type) => !multiSelect || !selectedOptions.includes(type));
  if (answered) {
    const visible = question.options.filter(
      (type) =>
        selectedOptions.includes(type) ||
        question.answer.correctOptions.includes(type),
    );
    return (
      <div
        className={styles.typePickerResults}
        role="list"
        aria-label="Type answers"
      >
        {visible.map((type) => {
          const outcome = answerOptionState({
            answered: true,
            multiSelect,
            selected: selectedOptions.includes(type),
            correct: question.answer.correctOptions.includes(type),
          });
          const status =
            outcome === 'wrong'
              ? 'Wrong pick'
              : outcome === 'missed'
                ? 'Missed'
                : 'Correct';
          return (
            <div
              className={`${styles.typePickerResult} ${outcome === 'correct' ? styles.typePickerResultCorrect : outcome === 'wrong' ? styles.typePickerResultWrong : outcome === 'missed' ? styles.typePickerResultMissed : ''}`.trim()}
              role="listitem"
              key={type}
            >
              <TypeBadges types={[type]} label={formatPokemonName(type)} />
              <span className="visually-hidden">{status}</span>
              {outcome === 'missed' ? (
                <MinusIcon aria-hidden="true" weight="bold" />
              ) : outcome === 'correct' ? (
                <CheckIcon aria-hidden="true" weight="bold" />
              ) : (
                <XIcon aria-hidden="true" weight="bold" />
              )}
              {question.visual?.kind === 'typeMatchup' && typeRelations ? (
                <AnswerEffectiveness
                  option={type}
                  isTypeOption
                  attackTypes={[type]}
                  defenderTypes={question.subject.types ?? []}
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
    <div className={`${styles.typePicker} ${styles.championSearch}`}>
      <label htmlFor={`${id}-input`}>
        {multiSelect ? 'Your types' : 'Your type'}
      </label>
      <SearchCombobox
        id={id}
        inputRef={input}
        className={styles.typePickerField}
        emptyClassName={styles.championSearchEmpty}
        query={query}
        onQueryChange={setQuery}
        suggestions={suggestions}
        hideSuggestions={!normalized}
        exactOption={suggestions.includes(normalized) ? normalized : undefined}
        onChoose={(type) => {
          onSelect(type);
          if (multiSelect) {
            setQuery('');
            input.current?.focus();
          }
        }}
        getKey={(type) => type}
        placeholder={multiSelect ? 'Add a type…' : 'Choose a type…'}
        emptyMessage={
          selectedOptions.includes(normalized)
            ? 'Already selected'
            : 'No matching types'
        }
        renderOption={(type) => (
          <TypeBadges types={[type]} label={formatPokemonName(type)} />
        )}
      />
      {multiSelect ? (
        <div
          className={styles.typePickerSelected}
          role="group"
          aria-label="Selected types"
        >
          {selectedOptions.map((type) => (
            <button
              type="button"
              className={styles.typePickerRemove}
              key={type}
              aria-label={`Remove ${formatPokemonName(type)}`}
              onClick={() => {
                onSelect(type);
                input.current?.focus();
              }}
            >
              <TypeBadges types={[type]} />
              <XIcon aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

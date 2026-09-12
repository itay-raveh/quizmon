import { useSuggestionNavigation } from '@/hooks/useSuggestionNavigation';
import { type ReactNode, type Ref } from 'react';

export const SearchCombobox = <Option,>({
  id,
  className,
  emptyClassName,
  query,
  onQueryChange,
  suggestions,
  onChoose,
  getKey,
  renderOption,
  placeholder,
  emptyMessage,
  disabled = false,
  invalid = false,
  hideSuggestions = false,
  inputRef,
  exactOption,
}: {
  id: string;
  className: string;
  emptyClassName: string;
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: readonly Option[];
  onChoose: (option: Option) => void;
  getKey: (option: Option) => string;
  renderOption: (option: Option) => ReactNode;
  placeholder: string;
  emptyMessage: string;
  disabled?: boolean;
  invalid?: boolean;
  hideSuggestions?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  exactOption?: Option;
}) => {
  const navigation = useSuggestionNavigation(suggestions, onChoose);
  const showSuggestions =
    navigation.open && !disabled && !hideSuggestions && query.trim().length > 0;
  const expanded = showSuggestions && suggestions.length > 0;
  return (
    <div className={className}>
      <input
        ref={inputRef}
        id={`${id}-input`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? id : undefined}
        aria-activedescendant={
          expanded && navigation.activeIndex >= 0
            ? `${id}-option-${navigation.activeIndex}`
            : undefined
        }
        aria-invalid={invalid || undefined}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onFocus={() => navigation.setOpen(true)}
        onBlur={() => navigation.setOpen(false)}
        onChange={(event) => {
          onQueryChange(event.target.value);
          navigation.resetActiveIndex();
          navigation.setOpen(true);
        }}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            navigation.open &&
            navigation.activeIndex < 0 &&
            exactOption !== undefined
          ) {
            event.preventDefault();
            navigation.choose(exactOption);
          } else navigation.handleKeyDown(event);
        }}
      />
      {showSuggestions ? (
        suggestions.length ? (
          <ul id={id} role="listbox">
            {suggestions.map((option, index) => (
              <li
                key={getKey(option)}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === navigation.activeIndex}
                ref={
                  index === navigation.activeIndex
                    ? navigation.activeOptionRef
                    : undefined
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => navigation.choose(option)}
              >
                {renderOption(option)}
              </li>
            ))}
          </ul>
        ) : (
          <p className={emptyClassName} role="status">
            {emptyMessage}
          </p>
        )
      ) : null}
    </div>
  );
};

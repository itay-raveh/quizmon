import { Autocomplete } from '@base-ui/react/autocomplete';
import { useState, type ReactNode, type Ref } from 'react';
import './search-combobox.css';

export const SearchCombobox = <Option,>({
  id,
  className,
  query,
  onQueryChange,
  suggestions,
  onChoose,
  getKey,
  getLabel,
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
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: readonly Option[];
  onChoose: (option: Option) => void;
  getKey: (option: Option) => string;
  getLabel: (option: Option) => string;
  renderOption: (option: Option) => ReactNode;
  placeholder: string;
  emptyMessage: string;
  disabled?: boolean;
  invalid?: boolean;
  hideSuggestions?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  exactOption?: Option;
}) => {
  const [open, setOpen] = useState(false);
  const expanded = open && !disabled && !hideSuggestions;
  return (
    <div className={className}>
      <Autocomplete.Root
        items={suggestions}
        filter={null}
        itemToStringValue={getLabel}
        value={query}
        onValueChange={(value, details) => {
          if (details.reason !== 'item-press') onQueryChange(value);
        }}
        open={expanded}
        onOpenChange={setOpen}
        openOnInputClick
        disabled={disabled}
      >
        <Autocomplete.Input
          ref={inputRef}
          id={`${id}-input`}
          aria-labelledby={`${id}-label`}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || !expanded) return;
            if (
              event.key === 'Enter' &&
              exactOption !== undefined &&
              !event.currentTarget.getAttribute('aria-activedescendant')
            ) {
              event.preventDefault();
              onChoose(exactOption);
              setOpen(false);
            }
          }}
        />
        <Autocomplete.Status className="visually-hidden">
          {expanded && suggestions.length > 0
            ? `${suggestions.length} results available.`
            : null}
        </Autocomplete.Status>
        <Autocomplete.Portal>
          <Autocomplete.Positioner
            className="search-combobox__positioner"
            sideOffset={7}
          >
            <Autocomplete.Popup className="search-combobox__popup">
              <Autocomplete.Empty>
                <p className="search-combobox__empty">{emptyMessage}</p>
              </Autocomplete.Empty>
              <Autocomplete.List
                className="search-combobox__list"
                aria-labelledby={`${id}-label`}
              >
                {(option: Option) => (
                  <Autocomplete.Item
                    key={getKey(option)}
                    className="search-combobox__option"
                    value={option}
                    onClick={() => onChoose(option)}
                  >
                    {renderOption(option)}
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
    </div>
  );
};

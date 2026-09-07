import { useState, type KeyboardEvent } from 'react';

export const useSuggestionNavigation = <Suggestion>(
  suggestions: readonly Suggestion[],
  onChoose: (suggestion: Suggestion) => void,
) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const resetActiveIndex = () => setActiveIndex(-1);

  const choose = (suggestion: Suggestion) => {
    onChoose(suggestion);
    resetActiveIndex();
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      resetActiveIndex();
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
        choose(suggestion);
      }
    }
  };

  return {
    activeIndex,
    choose,
    handleKeyDown,
    open,
    resetActiveIndex,
    setOpen,
  };
};

import { useCallback, useEffect, useState } from 'react';

export const useLeagueDestination = () => {
  const [isOpen, setIsOpen] = useState(
    () => new URLSearchParams(window.location.search).get('league') === 'hall',
  );
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const syncRoute = () => {
      setIsOpen(
        new URLSearchParams(window.location.search).get('league') === 'hall',
      );
    };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const open = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('league', 'hall');
    window.history.pushState(null, '', url);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('league');
    window.history.replaceState(window.history.state, '', url);
    setIsOpen(false);
    setShowResults(false);
  }, []);

  return { isOpen, open, close, showResults, setShowResults };
};

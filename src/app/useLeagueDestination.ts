import { useCallback, useEffect, useState } from 'react';

type LeagueView = 'challenge' | 'hall';
const readView = (): LeagueView | null => {
  const value = new URLSearchParams(window.location.search).get('league');
  return value === 'hall' || value === 'challenge' ? value : null;
};

export const useLeagueDestination = () => {
  const [view, setView] = useState(readView);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const syncRoute = () => setView(readView());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const open = useCallback((next: LeagueView = 'challenge') => {
    const url = new URL(window.location.href);
    url.searchParams.set('league', next);
    window.history.pushState(null, '', url);
    setView(next);
  }, []);

  const close = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('league');
    window.history.replaceState(window.history.state, '', url);
    setView(null);
    setShowResults(false);
  }, []);

  return {
    isOpen: view !== null,
    view,
    open,
    close,
    showResults,
    setShowResults,
  };
};

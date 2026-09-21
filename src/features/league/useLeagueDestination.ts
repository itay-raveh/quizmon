import type { LeagueView } from '@/domain/quiz/league';
import { useUpdateState } from '@/features/installation/update-session';
import { useEffect, useState } from 'react';

const readView = (): LeagueView | null => {
  const value = new URLSearchParams(window.location.search).get('league');
  return value === 'hall' || value === 'challenge' ? value : null;
};

export const useLeagueDestination = () => {
  const [view, setView] = useState(readView);
  const [showResults, setShowResults] = useUpdateState('league-results', false);

  useEffect(() => {
    const syncRoute = () => setView(readView());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const open = (next: LeagueView) => {
    const url = new URL(window.location.href);
    url.searchParams.set('league', next);
    window.history.pushState(null, '', url);
    setView(next);
  };

  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('league');
    window.history.replaceState(window.history.state, '', url);
    setView(null);
    setShowResults(false);
  };

  return {
    isOpen: view !== null,
    view,
    open,
    close,
    showResults,
    setShowResults,
  };
};

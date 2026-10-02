import type { LeagueView } from '@/domain/quiz/league';
import { useUpdateState } from '@/lib/storage/update-reload-state';
import { useNavigate, useLocation } from 'react-router';

export const useLeagueDestination = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isOpen = location.pathname === '/league';
  const requestedView = (location.state as { view?: unknown } | null)?.view;
  const view: LeagueView | null =
    isOpen && (requestedView === 'hall' || requestedView === 'challenge')
      ? requestedView
      : null;
  const [showResults, setShowResults] = useUpdateState('league-results', false);

  const open = (next: LeagueView) => {
    void navigate('/league', {
      state: { view: next },
      replace: isOpen,
    });
  };

  const close = () => {
    void navigate('/', { replace: true });
    setShowResults(false);
  };

  return {
    isOpen,
    view,
    open,
    close,
    showResults,
    setShowResults,
  };
};

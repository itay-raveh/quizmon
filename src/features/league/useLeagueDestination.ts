import type { LeagueView } from '@/domain/quiz/league';
import { useUpdateState } from '@/features/installation/update-session';
import { useNavigate, useLocation } from 'react-router';

const readView = (pathname: string): LeagueView | null =>
  pathname === '/league/hall-of-fame'
    ? 'hall'
    : pathname === '/league/challenge'
      ? 'challenge'
      : null;

export const useLeagueDestination = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const view = readView(location.pathname);
  const [showResults, setShowResults] = useUpdateState('league-results', false);

  const open = (next: LeagueView) => {
    void navigate(
      next === 'hall' ? '/league/hall-of-fame' : '/league/challenge',
    );
  };

  const close = () => {
    void navigate('/', { replace: true });
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

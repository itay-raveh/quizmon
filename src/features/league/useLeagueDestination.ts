import type { LeagueView } from '@/domain/quiz/league';
import { useNavigate } from '@tanstack/react-router';

export const useLeagueDestination = () => {
  const navigate = useNavigate();
  const open = (next: LeagueView) => {
    void navigate({ to: '/league', search: { view: next } });
  };

  const close = () => {
    void navigate({ to: '/', replace: true, ignoreBlocker: true });
  };

  return {
    open,
    close,
  };
};

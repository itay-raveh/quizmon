import { useLocation, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';
import { LeaderboardScreen } from './LeaderboardScreen';

export const RankingsRouteScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const search = useSearch({ from: '/rankings' });
  const selectStandings = useCallback(
    (date: string, scope: 'friends' | 'global', mode: 'daily' | 'training') => {
      void navigate({
        to: '/rankings',
        search: { date, scope, mode },
        replace: true,
        resetScroll: false,
      });
    },
    [navigate],
  );
  return (
    <LeaderboardScreen
      onAccount={() =>
        void navigate({
          to: '/account',
          search: { returnTo: `${location.pathname}${location.searchStr}` },
        })
      }
      onViewPlayer={(id) =>
        void navigate({
          to: '/players/$id',
          params: { id },
          search: { from: 'rankings', ...search },
        })
      }
      selectedDate={search.date}
      selectedScope={search.scope ?? 'friends'}
      selectedMode={search.mode ?? 'daily'}
      onSelectionChange={selectStandings}
    />
  );
};

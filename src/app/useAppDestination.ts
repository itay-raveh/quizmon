import { useCallback } from 'react';
import {
  useLocation,
  useMatchRoute,
  useNavigate,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import type { TrainerView } from '../domain/player/trainer-progression';
import type { LeaderboardMode } from '../domain/social/leaderboards';
import { trainerPath } from '../features/trainer/trainer-route';

type Destination = 'account' | 'friends' | 'rankings';
type ProfileState = { from?: 'friends' | 'rankings' };

export function useAppDestination() {
  const location = useLocation();
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const router = useRouter();
  const search = useSearch({ strict: false });
  const playerMatch = matchRoute({ to: '/players/$id' });
  const playerId = playerMatch ? playerMatch.id : '';
  const profileFrom = (location.state as ProfileState | null)?.from;
  const accountOpen = Boolean(matchRoute({ to: '/account' }));
  const friendsOpen = Boolean(matchRoute({ to: '/account/friends' }));
  const rankingsOpen = Boolean(matchRoute({ to: '/rankings' }));
  const destination: Destination | null =
    accountOpen && !friendsOpen
      ? 'account'
      : friendsOpen || (playerId && profileFrom === 'friends')
        ? 'friends'
        : rankingsOpen || playerId
          ? 'rankings'
          : null;

  const account = (returnTo?: string) => {
    const origin =
      returnTo ?? `${location.pathname}${location.searchStr}${location.hash}`;
    void navigate({ to: '/account', search: { returnTo: origin } });
  };

  const viewPlayer = (id: string) => {
    void navigate({
      to: '/players/$id',
      params: { id },
      state: { from: destination === 'friends' ? 'friends' : 'rankings' },
    });
  };

  const closePlayer = () => {
    if (profileFrom) router.history.back();
    else void navigate({ to: '/rankings', replace: true });
  };

  const trainer = (view: TrainerView = 'front', edit = false) => {
    void navigate({ to: edit ? '/trainer/edit' : trainerPath(view) });
  };

  const selectStandings = useCallback(
    (date: string, scope: 'global' | 'friends', mode: LeaderboardMode) => {
      void navigate({
        to: '/rankings',
        search: { date, scope, mode },
        replace: true,
        resetScroll: false,
      });
    },
    [navigate],
  );

  return {
    account,
    isKnownPath: router.state.matches.some(
      (match) => match.routeId !== '__root__',
    ),
    pathname: location.pathname,
    destination,
    friendId: friendsOpen && 'id' in search ? (search.id ?? '') : '',
    playerId,
    viewPlayer,
    closePlayer,
    trainer,
    standingsDate: rankingsOpen && 'date' in search ? search.date : undefined,
    standingsScope:
      rankingsOpen && 'scope' in search && search.scope === 'global'
        ? ('global' as const)
        : ('friends' as const),
    standingsMode:
      rankingsOpen && 'mode' in search && search.mode === 'training'
        ? ('training' as const)
        : ('daily' as const),
    selectStandings,
  };
}

import { useCallback } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router';
import type { TrainerView } from '../domain/player/trainer-progression';
import type { LeaderboardMode } from '../domain/social/leaderboards';
import { trainerPath } from '../features/trainer/trainer-route';
import { isGamePath } from './game-path';

type Destination = 'account' | 'friends' | 'leaderboards';
type ProfileState = { from?: 'friends' | 'leaderboards' };

export function useAppDestination() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const playerId =
    matchPath('/social/players/:id', location.pathname)?.params.id ?? '';
  const profileFrom = (location.state as ProfileState | null)?.from;
  const destination: Destination | null =
    location.pathname === '/account'
      ? 'account'
      : location.pathname === '/social/friends' ||
          (playerId && profileFrom === 'friends')
        ? 'friends'
        : location.pathname === '/social/rankings' || playerId
          ? 'leaderboards'
          : null;

  const open = (next: 'friends' | 'leaderboards') => {
    void navigate(next === 'friends' ? '/social/friends' : '/social/rankings');
  };

  const account = (returnTo?: string) => {
    const origin =
      returnTo ?? `${location.pathname}${location.search}${location.hash}`;
    void navigate(`/account?returnTo=${encodeURIComponent(origin)}`);
  };

  const viewPlayer = (id: string) => {
    void navigate(`/social/players/${encodeURIComponent(id)}`, {
      state: { from: destination === 'friends' ? 'friends' : 'leaderboards' },
    });
  };

  const closePlayer = () => {
    if (profileFrom) void navigate(-1);
    else void navigate('/social/rankings', { replace: true });
  };

  const trainer = (view: TrainerView = 'front', edit = false) => {
    void navigate(edit ? '/trainer/edit' : trainerPath(view));
  };

  const selectStandings = useCallback(
    (date: string, scope: 'global' | 'friends', mode: LeaderboardMode) => {
      void navigate(
        `/social/rankings?${new URLSearchParams({ date, scope, mode })}`,
        { replace: true, preventScrollReset: true },
      );
    },
    [navigate],
  );

  return {
    account,
    isKnownPath: isGamePath(location.pathname),
    pathname: location.pathname,
    destination,
    friendCode:
      location.pathname === '/social/friends' ? (params.get('code') ?? '') : '',
    playerId,
    viewPlayer,
    closePlayer,
    open,
    trainer,
    standingsDate: params.get('date') ?? undefined,
    standingsScope:
      params.get('scope') === 'friends'
        ? ('friends' as const)
        : ('global' as const),
    standingsMode:
      params.get('mode') === 'training'
        ? ('training' as const)
        : ('daily' as const),
    selectStandings,
  };
}

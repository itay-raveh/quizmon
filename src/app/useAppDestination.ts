import { useCallback, useSyncExternalStore } from 'react';
import type { TrainerView } from '../domain/player/trainer-progression';
import type { LeaderboardMode } from '../domain/social/leaderboards';
import { setTrainerRoute } from '../features/trainer/trainer-route';
import { isRecord } from '../lib/validation';

type Destination = 'account' | 'friends' | 'leaderboards';
const locationSnapshot = () => window.location.href;
const subscribeLocation = (listener: () => void) => {
  window.addEventListener('popstate', listener);
  window.addEventListener('hashchange', listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener('hashchange', listener);
  };
};
const navigate = (url: URL, replace = false) => {
  window.history[replace ? 'replaceState' : 'pushState'](
    { quizmonDestination: true },
    '',
    url,
  );
  window.dispatchEvent(new PopStateEvent('popstate'));
};
const clearDestination = (url: URL) => {
  for (const key of [
    'screen',
    'returnTo',
    'standings',
    'players',
    'ranking',
    'trainer',
    'league',
  ])
    url.searchParams.delete(key);
  const fragment = new URLSearchParams(url.hash.slice(1));
  fragment.delete('friend');
  url.hash = fragment.toString();
  return url;
};

export function useAppDestination() {
  const href = useSyncExternalStore(subscribeLocation, locationSnapshot);
  const url = new URL(href);
  const screen = url.searchParams.get('screen');
  const friendCode = new URLSearchParams(url.hash.slice(1)).get('friend');
  const destination: Destination | null =
    screen === 'account' || screen === 'friends' || screen === 'leaderboards'
      ? screen
      : friendCode !== null
        ? 'friends'
        : null;

  const open = (next: Destination, date?: string) => {
    const target = new URL(window.location.href);
    target.searchParams.set('screen', next);
    target.searchParams.delete('returnTo');
    if (date) target.searchParams.set('standings', date);
    target.hash = '';
    navigate(target);
  };

  const account = (returnTo?: string) => {
    const target = new URL(window.location.href);
    const origin =
      returnTo ?? `${target.pathname}${target.search}${target.hash}`;
    target.searchParams.set('screen', 'account');
    target.searchParams.set('returnTo', origin);
    navigate(target);
  };

  const trainer = (view: TrainerView = 'front') => {
    const target = clearDestination(new URL(window.location.href));
    setTrainerRoute(target, view);
    navigate(target);
  };

  const play = () => {
    navigate(clearDestination(new URL(window.location.href)));
  };

  const back = (fallback: 'play' | 'trainer' | 'leaderboards' = 'play') => {
    const state: unknown = window.history.state;
    if (isRecord(state) && state.quizmonDestination === true) {
      window.history.back();
      return;
    }
    const target = clearDestination(new URL(window.location.href));
    if (fallback === 'trainer') setTrainerRoute(target, 'front');
    if (fallback === 'leaderboards') {
      target.searchParams.set('screen', 'leaderboards');
      target.searchParams.set('players', 'friends');
    }
    navigate(target, true);
  };

  const selectStandings = useCallback(
    (date: string, scope: 'global' | 'friends', mode: LeaderboardMode) => {
      const target = new URL(window.location.href);
      target.searchParams.set('standings', date);
      target.searchParams.set('players', scope);
      target.searchParams.set('ranking', mode);
      window.history.replaceState(window.history.state, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    [],
  );

  return {
    account,
    back,
    destination,
    friendCode: friendCode ?? '',
    open,
    play,
    trainer,
    standingsDate: url.searchParams.get('standings') ?? undefined,
    standingsScope:
      url.searchParams.get('players') === 'friends'
        ? ('friends' as const)
        : ('global' as const),
    standingsMode:
      url.searchParams.get('ranking') === 'training'
        ? ('training' as const)
        : ('daily' as const),
    selectStandings,
  };
}

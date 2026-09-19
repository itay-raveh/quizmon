import { useCallback, useSyncExternalStore } from 'react';
import type { TrainerView } from '../domain/player/trainer-progression';
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

  const open = useCallback((next: Destination, date?: string) => {
    const target = new URL(window.location.href);
    target.searchParams.set('screen', next);
    target.searchParams.delete('returnTo');
    if (date) target.searchParams.set('standings', date);
    if (next !== 'friends') target.hash = '';
    navigate(target);
  }, []);

  const account = useCallback((returnTo?: string) => {
    const target = new URL(window.location.href);
    const origin =
      returnTo ?? `${target.pathname}${target.search}${target.hash}`;
    target.searchParams.set('screen', 'account');
    target.searchParams.set('returnTo', origin);
    navigate(target);
  }, []);

  const trainer = useCallback((view: TrainerView = 'front') => {
    const target = clearDestination(new URL(window.location.href));
    setTrainerRoute(target, view);
    navigate(target);
  }, []);

  const play = useCallback(() => {
    navigate(clearDestination(new URL(window.location.href)));
  }, []);

  const back = useCallback(
    (fallback: 'play' | 'trainer' | 'leaderboards' = 'play') => {
      const state: unknown = window.history.state;
      if (
        isRecord(state) &&
        (state.quizmonDestination === true || state.quizmonTrainerCard === true)
      ) {
        window.history.back();
      } else {
        const target = clearDestination(new URL(window.location.href));
        if (fallback === 'trainer') setTrainerRoute(target, 'front');
        if (fallback === 'leaderboards') {
          target.searchParams.set('screen', 'leaderboards');
          target.searchParams.set('players', 'friends');
        }
        navigate(target, true);
      }
    },
    [],
  );

  const selectStandings = useCallback(
    (date: string, scope: 'global' | 'friends') => {
      const target = new URL(window.location.href);
      target.searchParams.set('standings', date);
      target.searchParams.set('players', scope);
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
    href,
    open,
    play,
    trainer,
    standingsDate: url.searchParams.get('standings') ?? undefined,
    standingsScope:
      url.searchParams.get('players') === 'friends'
        ? ('friends' as const)
        : ('global' as const),
    selectStandings,
  };
}

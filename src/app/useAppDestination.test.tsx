import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAppDestination } from './useAppDestination';

describe('app destinations', () => {
  it('returns a direct friend invitation to the Friends leaderboard', () => {
    window.history.replaceState(null, '', '/#friend=abcd1234abcd1234');
    const { result } = renderHook(useAppDestination);

    act(() => result.current.back('leaderboards'));

    expect(result.current.destination).toBe('leaderboards');
    expect(result.current.standingsScope).toBe('friends');
    expect(result.current.friendCode).toBe('');
  });

  it('returns a directly opened account to Play', () => {
    window.history.replaceState(null, '', '/?screen=account');
    const { result } = renderHook(useAppDestination);

    act(() => result.current.back());

    expect(result.current.destination).toBeNull();
    expect(window.location.search).toBe('');
  });

  it('keeps the invitation while signing in and clears it when returning to Play', () => {
    window.history.replaceState(null, '', '/#friend=abcd1234abcd1234');
    const { result } = renderHook(useAppDestination);
    expect(result.current.destination).toBe('friends');
    act(() => result.current.account());
    expect(result.current.destination).toBe('account');
    expect(new URL(window.location.href).searchParams.get('returnTo')).toBe(
      '/#friend=abcd1234abcd1234',
    );
    act(() => result.current.play());
    expect(result.current.destination).toBeNull();
    expect(result.current.friendCode).toBe('');
  });

  it('returns to the same standings selection after managing friends', async () => {
    window.history.replaceState(null, '', '/');
    const { result } = renderHook(useAppDestination);
    act(() => result.current.open('leaderboards', '2026-09-17'));
    act(() => result.current.selectStandings('2026-09-16', 'friends'));
    act(() => result.current.open('friends'));
    act(() => result.current.back());
    await waitFor(() =>
      expect(result.current.destination).toBe('leaderboards'),
    );
    expect(result.current.standingsDate).toBe('2026-09-16');
    expect(result.current.standingsScope).toBe('friends');
  });

  it('returns from primary Trainer navigation to the previous leaderboard date and scope', async () => {
    window.history.replaceState(null, '', '/');
    const { result } = renderHook(useAppDestination);
    act(() => result.current.open('leaderboards', '2026-09-17'));
    act(() => result.current.selectStandings('2026-09-16', 'friends'));
    const standingsUrl = window.location.href;

    act(() => result.current.trainer());
    expect(window.location.search).toBe('?trainer=card');
    expect(result.current.destination).toBeNull();
    act(() => result.current.back('play'));

    await waitFor(() => expect(window.location.href).toBe(standingsUrl));
    expect(result.current.destination).toBe('leaderboards');
    expect(result.current.standingsDate).toBe('2026-09-16');
    expect(result.current.standingsScope).toBe('friends');
  });

  it('also returns through the existing Trainer history marker', async () => {
    window.history.replaceState(null, '', '/');
    const { result } = renderHook(useAppDestination);
    act(() => result.current.open('leaderboards', '2026-09-17'));
    const standingsUrl = window.location.href;
    window.history.pushState(
      { quizmonTrainerCard: true },
      '',
      '/?trainer=badges',
    );

    act(() => result.current.back('play'));

    await waitFor(() => expect(window.location.href).toBe(standingsUrl));
    expect(result.current.destination).toBe('leaderboards');
    expect(result.current.standingsDate).toBe('2026-09-17');
  });

  it('returns a directly opened Trainer page to Play without leaving the app', () => {
    window.history.replaceState(null, '', '/?trainer=card');
    const back = vi.spyOn(window.history, 'back');
    const { result } = renderHook(useAppDestination);

    act(() => result.current.back('play'));

    expect(back).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('');
    expect(result.current.destination).toBeNull();
    back.mockRestore();
  });

  it('opens Trainer without leaving stale account, league or invitation routes', () => {
    window.history.replaceState(
      null,
      '',
      '/?screen=account&league=hall#friend=abcd1234abcd1234',
    );
    const { result } = renderHook(useAppDestination);
    act(() => result.current.trainer('badges'));
    expect(window.location.search).toBe('?trainer=badges');
    expect(result.current.destination).toBeNull();
  });
});

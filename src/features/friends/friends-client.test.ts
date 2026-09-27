import { afterEach, expect, test, vi } from 'vitest';
import { cachedOwnPlayer, ownPlayer } from './friends-client';

vi.mock('../account/account', () => ({
  accountSnapshot: () => ({ owner: 'cache-test-owner' }),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('cached identity is scoped to its owner and expires for refresh', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () =>
          Promise.resolve({
            accountId: 'cache-test-owner',
            player: {
              id: 'cache-test-owner',
              code: 'AABBCCDDEEFF0011',
              name: 'Trainer',
              partnerPokemon: null,
            },
          }),
      }),
    ),
  );

  await ownPlayer('cache-test-owner');
  expect(cachedOwnPlayer('cache-test-owner', 60_000)?.code).toBe(
    'AABBCCDDEEFF0011',
  );
  expect(cachedOwnPlayer('another-owner')).toBeUndefined();
  vi.advanceTimersByTime(60_000);
  expect(cachedOwnPlayer('cache-test-owner', 60_000)).toBeUndefined();
});

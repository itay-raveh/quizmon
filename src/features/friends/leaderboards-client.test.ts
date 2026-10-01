import { expect, test, vi } from 'vitest';
import { readTrainingLeaderboard } from './leaderboards-client';

vi.mock('../account/account', () => ({
  accountSnapshot: () => ({ owner: 'trainer' }),
}));

test('rejects a malformed leaderboard count from the server', async () => {
  const response = {
    accountId: 'trainer',
    scope: 'global',
    checkedAt: new Date().toISOString(),
    total: 1,
    items: [
      {
        player: {
          id: 'trainer',
          code: null,
          name: 'Trainer',
          partnerPokemon: null,
          leagueCompleted: false,
        },
        rank: 1,
        score: 10,
        elapsedMilliseconds: 1000,
      },
    ],
    viewer: null,
    nextCursor: null,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
      }),
    ),
  );
  try {
    const signal = new AbortController().signal;
    await expect(
      readTrainingLeaderboard('trainer', 'global', null, 5, signal),
    ).resolves.toMatchObject({ total: 1, items: [{ comparable: true }] });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain('limit=5');
    response.items[0]!.rank = -1;
    await expect(
      readTrainingLeaderboard('trainer', 'global', null, 5, signal),
    ).rejects.toThrow('unreadable response');
    response.items[0]!.rank = 1;
    Reflect.deleteProperty(response.items[0]!.player, 'leagueCompleted');
    await expect(
      readTrainingLeaderboard('trainer', 'global', null, 5, signal),
    ).rejects.toThrow('unreadable response');
  } finally {
    vi.unstubAllGlobals();
  }
});

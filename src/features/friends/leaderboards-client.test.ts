import type { DailyLeaderboard } from '../../domain/social/leaderboards';
import {
  readDailyLeaderboard,
  readTrainingLeaderboard,
} from './leaderboards-client';

const state = vi.hoisted(() => ({ owner: 'viewer' }));
vi.mock('../account/account', () => ({ accountSnapshot: () => state }));
const data: DailyLeaderboard = {
  accountId: 'viewer',
  date: '2026-09-14',
  scope: 'friends',
  checkedAt: '2026-09-14T12:00:00.000Z',
  total: 1,
  nextCursor: null,
  items: [
    {
      player: {
        id: 'viewer',
        name: 'Trainer',
        code: null,
        partnerPokemon: null,
      },
      rank: 1,
      score: 1000,
      elapsedMilliseconds: 1000,
    },
  ],
  viewer: null,
};
const read = () =>
  readDailyLeaderboard(
    'viewer',
    data.date,
    'friends',
    'a'.repeat(64),
    null,
    new AbortController().signal,
  );
afterEach(() => {
  state.owner = 'viewer';
  vi.unstubAllGlobals();
});

it('reads the selected board using the session', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(data));
  vi.stubGlobal('fetch', fetch);
  await expect(read()).resolves.toEqual(data);
  expect(fetch).toHaveBeenCalledWith(
    `/api/leaderboards/daily?date=2026-09-14&scope=friends&puzzle=${'a'.repeat(64)}`,
    expect.objectContaining({
      credentials: 'same-origin',
    }),
  );
});

it('reads Training standings without a date', async () => {
  const training = Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== 'date'),
  );
  const fetch = vi.fn().mockResolvedValue(Response.json(training));
  vi.stubGlobal('fetch', fetch);
  await expect(
    readTrainingLeaderboard(
      'viewer',
      'friends',
      null,
      new AbortController().signal,
    ),
  ).resolves.toEqual(training);
  expect(fetch).toHaveBeenCalledWith(
    '/api/leaderboards/training?scope=friends',
    expect.objectContaining({ credentials: 'same-origin' }),
  );
});

it('discards a response when the active account changed during the request', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      state.owner = 'another';
      return Promise.resolve(Response.json(data));
    }),
  );
  await expect(read()).rejects.toThrow('Your account changed');
});

it.each([
  { ...data, scope: 'global' },
  { ...data, date: '2026-09-13' },
  { ...data, accountId: 'another' },
  { ...data, items: [{ ...data.items[0], rank: '1' }] },
])('rejects a mismatched or malformed leaderboard response', async (value) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(value)));
  await expect(read()).rejects.toThrow('unreadable response');
});

it.each([
  [401, 'Sign in again'],
  [429, 'Wait a minute'],
  [503, 'unavailable'],
])(
  'explains an HTTP %i failure before trying to parse its body',
  async (status, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Unavailable', { status })),
    );
    await expect(read()).rejects.toThrow(message);
  },
);

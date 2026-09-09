import worker, { DailyReminder } from '../worker/index';
import { getNextReminderAt } from '../worker/reminder-time';
import catalog from '../src/game/data/pokemon.json';

const validEvent = {
  contentVersion: 3,
  correctCount: 4,
  elapsedSeconds: 42,
  mode: 'daily',
  questionCount: 5,
  score: 12_345,
  scoreVersion: 2,
  type: 'game_completed',
};

const makeEnv = () => {
  const writeDataPoint = vi.fn();
  const reminderFetch = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 204 }));
  return {
    env: {
      ANALYTICS: { writeDataPoint },
      ASSETS: { fetch: vi.fn() },
      DAILY_REMINDERS: {
        getByName: vi.fn(() => ({ fetch: reminderFetch })),
      },
      VAPID_PRIVATE_KEY: 'test-private-key',
    },
    reminderFetch,
    writeDataPoint,
  };
};

const mockSpriteFetch = () => {
  const upstream = vi.fn(() =>
    Promise.resolve(
      new Response(new Uint8Array([1]), {
        headers: { 'Content-Type': 'image/png' },
      }),
    ),
  );
  vi.stubGlobal('fetch', upstream);
  return upstream;
};

describe('Daily reminders', () => {
  it('schedules 8:00 AM in the saved time zone across a DST change', () => {
    expect(
      new Date(
        getNextReminderAt(
          'America/New_York',
          Date.parse('2026-10-31T13:00:00.000Z'),
        ),
      ).toISOString(),
    ).toBe('2026-11-01T13:00:00.000Z');
  });

  it.each([
    ['2024-02-29', 204],
    ['2026-09-08', 204],
    ['2026-02-29', 400],
    ['2026-13-01', 400],
    ['2026-09-08\n', 400],
    [null, 400],
    [20260908, 400],
  ])(
    'validates completion date %j before storing reminders',
    async (completedDate, status) => {
      const registration = {
        subscription: {
          endpoint: 'https://example.com/push',
          keys: { auth: 'test-auth', p256dh: 'test-key' },
        },
        timeZone: 'UTC',
      };
      for (const method of ['PUT', 'PATCH']) {
        const storage = {
          get: vi.fn().mockResolvedValue(registration),
          put: vi.fn(),
          setAlarm: vi.fn(),
        };
        const reminder = new DailyReminder({ storage }, makeEnv().env);
        const response = await reminder.fetch(
          new Request('https://example.com/', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...registration, completedDate }),
          }),
        );
        expect(response.status).toBe(status);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(await response.text()).toBe(
          status === 204
            ? ''
            : method === 'PUT'
              ? 'Invalid reminder'
              : 'Invalid completion date',
        );
        if (status === 204) {
          expect(storage.put).toHaveBeenCalledWith('daily-reminder', {
            ...registration,
            completedDate,
          });
        } else {
          expect(storage.put).not.toHaveBeenCalled();
          expect(storage.setAlarm).not.toHaveBeenCalled();
        }
      }
    },
  );

  it.each(['GET', 'HEAD', 'POST', 'OPTIONS'])(
    'returns the same 405 contract for %s at both reminder boundaries',
    async (method) => {
      const { env, reminderFetch } = makeEnv();
      const reminder = new DailyReminder({ storage: {} }, env);
      const request = new Request(
        'https://example.com/api/daily-reminders/3c29978c-0c0a-4c95-a19d-9d2cf5e36493',
        { method, headers: { Origin: 'https://example.com' } },
      );
      const responses = [
        await worker.fetch(request, env),
        await reminder.fetch(request),
      ];
      for (const response of responses) {
        expect(response.status).toBe(405);
        expect(response.headers.get('Allow')).toBe('PUT, PATCH, DELETE');
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(await response.text()).toBe('Method not allowed');
      }
      expect(reminderFetch).not.toHaveBeenCalled();
    },
  );

  it('only forwards reminder changes made by the app origin', async () => {
    const { env, reminderFetch } = makeEnv();
    const sameOrigin = await worker.fetch(
      new Request(
        'https://quizmon.raveh.dev/api/daily-reminders/3c29978c-0c0a-4c95-a19d-9d2cf5e36493',
        {
          headers: { Origin: 'https://quizmon.raveh.dev' },
          method: 'DELETE',
        },
      ),
      env,
    );
    const crossOrigin = await worker.fetch(
      new Request(
        'https://quizmon.raveh.dev/api/daily-reminders/3c29978c-0c0a-4c95-a19d-9d2cf5e36493',
        {
          headers: { Origin: 'https://example.com' },
          method: 'DELETE',
        },
      ),
      env,
    );

    expect(sameOrigin.status).toBe(204);
    expect(crossOrigin.status).toBe(403);
    expect(reminderFetch).toHaveBeenCalledOnce();
  });
});

describe('analytics endpoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['a page view', { type: 'page_view' }, { indexes: ['page_view'] }],
    [
      'a game start',
      { mode: 'training', questionCount: 10, type: 'game_started' },
      {
        blobs: ['training'],
        doubles: [10],
        indexes: ['game_started'],
      },
    ],
    [
      'a Daily completion',
      validEvent,
      {
        blobs: ['daily'],
        doubles: [5, 4, 12_345, 42, 3, 2],
        indexes: ['game_completed'],
      },
    ],
    [
      'a League completion',
      { ...validEvent, mode: 'league' },
      {
        blobs: ['league'],
        doubles: [5, 4, 12_345, 42, 3, 2],
        indexes: ['game_completed'],
      },
    ],
  ])('records %s without identifying data', async (_name, event, dataPoint) => {
    const { env, writeDataPoint } = makeEnv();
    const response = await worker.fetch(
      new Request('https://quizmon.raveh.dev/api/events', {
        body: JSON.stringify(event),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      env,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(writeDataPoint).toHaveBeenCalledExactlyOnceWith(dataPoint);
  });

  it.each([
    ['a GET request', undefined, {}, 405, 'Method not allowed'],
    [
      'a non-JSON request',
      'event',
      { method: 'POST', headers: { 'Content-Type': 'text/plain' } },
      415,
      'Expected application/json',
    ],
    [
      'an invalid event',
      JSON.stringify({ ...validEvent, correctCount: 6 }),
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      400,
      'Invalid event',
    ],
    [
      'malformed JSON',
      '{',
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      400,
      'Invalid event',
    ],
    [
      'an oversized declared body',
      '{}',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '1025',
        },
      },
      413,
      'Request body too large',
    ],
    [
      'an oversized actual body',
      ' '.repeat(1025),
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      413,
      'Request body too large',
    ],
  ])('rejects %s', async (_name, body, init, status, message) => {
    const { env, writeDataPoint } = makeEnv();
    const response = await worker.fetch(
      new Request('https://quizmon.raveh.dev/api/events', {
        body,
        ...init,
      }),
      env,
    );

    expect(response.status).toBe(status);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Allow')).toBe(status === 405 ? 'POST' : null);
    expect(await response.text()).toBe(message);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });

  it('proxies supported sprite families with matching content types', async () => {
    const upstream = mockSpriteFetch();
    const { env } = makeEnv();
    const examples = [
      [
        '/sprites/pokemon/versions/generation-ii/crystal/back/25.png',
        'image/png',
      ],
      ['/sprites/pokemon/other/official-artwork/25.png', 'image/png'],
      ['/sprites/pokemon/other/dream-world/25.svg', 'image/svg+xml'],
      ['/sprites/pokemon/other/showdown/25.gif', 'image/gif'],
    ] as const;

    for (const [path, contentType] of examples) {
      const response = await worker.fetch(
        new Request(`https://quizmon.raveh.dev${path}`),
        env,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe(contentType);
      expect(upstream).toHaveBeenCalledWith(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites${path.slice('/sprites'.length)}`,
        expect.objectContaining({
          cf: { cacheEverything: true, cacheTtl: 2_592_000 },
        }),
      );
    }
  });

  it('proxies every version and orientation used by the shipped catalog', async () => {
    const upstream = mockSpriteFetch();
    const { env } = makeEnv();
    const paths = new Map<string, string>();
    for (const pokemon of Object.values(catalog.pokemon)) {
      for (const generation of pokemon.identitySprites.generations) {
        for (const orientation of ['front', 'back'] as const) {
          for (const version of generation[orientation]) {
            const family = `generation-${generation.generation.toLowerCase()}/${version}/${orientation === 'back' ? 'back/' : ''}`;
            paths.set(
              family,
              `/sprites/pokemon/versions/${family}${pokemon.id}.png`,
            );
          }
        }
      }
    }

    for (const path of paths.values()) {
      const response = await worker.fetch(
        new Request(`https://example.com${path}`),
        env,
      );
      expect(response, path).toBeDefined();
      expect(response.status, path).toBe(200);
      expect(response.headers.get('Content-Type'), path).toBe('image/png');
      expect(upstream).toHaveBeenLastCalledWith(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites${path.slice('/sprites'.length)}`,
        expect.any(Object),
      );
    }
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it('does not serve SPA HTML for unsupported sprite paths', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const { env } = makeEnv();
    for (const path of [
      '/sprites/pokemon/versions/generation-i/black-white/83.png',
      '/sprites/pokemon/versions/generation-v/black-white/83.html',
      '/sprites/pokemon/versions/generation-v/black-white/0.png',
      '/sprites/pokemon/unknown/83.png',
    ]) {
      const response = await worker.fetch(
        new Request(`https://example.com${path}`),
        env,
      );
      expect(response.status).toBe(404);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
    expect(upstream).not.toHaveBeenCalled();
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });
});

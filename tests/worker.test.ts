import catalog from '../src/domain/pokemon/data/pokemon.json';
import worker, { DailyReminder } from '../worker/game';
import { getNextReminderAt } from '../worker/reminder-time';

const makeEnv = () => {
  const reminderFetch = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 204 }));
  return {
    env: {
      ASSETS: { fetch: vi.fn() },
      DAILY_REMINDERS: {
        getByName: vi.fn(() => ({ fetch: reminderFetch })),
      },
      VAPID_PRIVATE_KEY: 'test-private-key',
    },
    reminderFetch,
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
  it('deletes pre-reset registrations before sending another reminder', async () => {
    const storage = {
      get: vi.fn().mockResolvedValue({ subscription: {}, timeZone: 'UTC' }),
      deleteAll: vi.fn(),
    };
    const reminder = new DailyReminder({ storage }, makeEnv().env);
    await reminder.alarm();
    expect(storage.deleteAll).toHaveBeenCalledOnce();
  });

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
        version: 1,
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

  it('bounds reminder bodies by bytes before parsing', async () => {
    const storage = {
      get: vi.fn().mockResolvedValue({ version: 1 }),
      put: vi.fn(),
    };
    const reminder = new DailyReminder({ storage }, makeEnv().env);
    const url =
      'https://example.com/api/daily-reminders/3c29978c-0c0a-4c95-a19d-9d2cf5e36493';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(8_193));
      },
    });
    const request = (body: BodyInit) =>
      new Request(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' });
    const status = async (body: BodyInit) =>
      (await reminder.fetch(request(body))).status;

    const oversized = request(stream);
    expect(oversized.headers.has('Content-Length')).toBe(false);
    expect((await reminder.fetch(oversized)).status).toBe(400);
    expect(
      await status(
        JSON.stringify({
          completedDate: '2026-09-24',
          note: 'é'.repeat(4_100),
        }),
      ),
    ).toBe(400);
    expect(storage.put).not.toHaveBeenCalled();
    expect(await status(JSON.stringify({ completedDate: '2026-09-24' }))).toBe(
      204,
    );
  });

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

describe('sprite proxy', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('proxies supported sprite families with matching content types', async () => {
    const upstream = mockSpriteFetch();
    const { env } = makeEnv();
    const examples = [
      ['/sprites/items/poke-ball.png', 'image/png'],
      ['/sprites/items/full-restore.png', 'image/png'],
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
          for (const path of generation[orientation]) {
            const family = path.slice(0, path.lastIndexOf('/'));
            paths.set(family, path);
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
      '/sprites/items/poke-ball.svg',
      '/sprites/items/poke-ball.html',
      '/sprites/items/subdirectory/poke-ball.png',
      '/sprites/items/%2Fexample.com.png',
      '/sprites/items/https:example.com.png',
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

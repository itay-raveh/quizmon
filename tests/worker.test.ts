import worker from '../worker/index';

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
  return {
    env: {
      ANALYTICS: { writeDataPoint },
      ASSETS: { fetch: vi.fn() },
    },
    writeDataPoint,
  };
};

describe('analytics endpoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('records one aggregate event without identifying data', async () => {
    const { env, writeDataPoint } = makeEnv();
    const response = await worker.fetch(
      new Request('https://quizmon.raveh.dev/api/events', {
        body: JSON.stringify(validEvent),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      env,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(writeDataPoint).toHaveBeenCalledOnce();
    expect(writeDataPoint).toHaveBeenCalledWith({
      blobs: ['daily'],
      doubles: [5, 4, 12_345, 42, 3, 2],
      indexes: ['game_completed'],
    });
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
  ])('records %s', async (_name, event, dataPoint) => {
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
    expect(writeDataPoint).toHaveBeenCalledWith(dataPoint);
  });

  it('accepts Quizmon League completions', async () => {
    const { env, writeDataPoint } = makeEnv();
    const response = await worker.fetch(
      new Request('https://quizmon.raveh.dev/api/events', {
        body: JSON.stringify({ ...validEvent, mode: 'league' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      env,
    );

    expect(response.status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({ blobs: ['league'] }),
    );
  });

  it.each([
    ['a GET request', undefined, {}, 405],
    [
      'a non-JSON request',
      'event',
      { method: 'POST', headers: { 'Content-Type': 'text/plain' } },
      415,
    ],
    [
      'an invalid event',
      JSON.stringify({ ...validEvent, correctCount: 6 }),
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      400,
    ],
  ])('rejects %s', async (_name, body, init, status) => {
    const { env, writeDataPoint } = makeEnv();
    const response = await worker.fetch(
      new Request('https://quizmon.raveh.dev/api/events', {
        body,
        ...init,
      }),
      env,
    );

    expect(response.status).toBe(status);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });

  it('proxies supported sprite families with matching content types', async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1]), {
        headers: { 'Content-Type': 'image/png' },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', upstream);
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
});

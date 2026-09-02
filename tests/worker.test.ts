import worker from '../worker/index';

const validEvent = {
  contentVersion: 3,
  correctCount: 4,
  elapsedSeconds: 42,
  mode: 'daily',
  questionCount: 5,
  score: 12_345,
  scoreVersion: 2,
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

describe('game completion analytics endpoint', () => {
  it('records one aggregate event without identifying data', async () => {
    const { env, writeDataPoint } = makeEnv();
    const response = await worker.fetch(
      new Request('https://quizmon.raveh.dev/api/events/game-completed', {
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
      new Request('https://quizmon.raveh.dev/api/events/game-completed', {
        body,
        ...init,
      }),
      env,
    );

    expect(response.status).toBe(status);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });
});

import { handler } from '../worker/index';

test('maintenance mode serves a non-cached 503 page and pauses the API', async () => {
  const assets = {
    fetch: vi.fn().mockResolvedValue(new Response('<h1>Paused</h1>')),
  };
  const env = {
    ASSETS: assets,
    MAINTENANCE_MODE: 'on',
  } as unknown as Parameters<typeof handler.fetch>[1];

  const page = await handler.fetch(new Request('https://quizmon.test/'), env);
  expect(page.status).toBe(503);
  expect(page.headers.get('Cache-Control')).toBe('no-store');
  expect(page.headers.get('Retry-After')).toBe('300');
  expect(page.headers.get('X-Quizmon-Maintenance')).toBe('1');
  expect(await page.text()).toBe('<h1>Paused</h1>');
  expect(assets.fetch).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'https://quizmon.test/maintenance.html' }),
  );

  const api = await handler.fetch(
    new Request('https://quizmon.test/api/auth/sign-in/email', {
      method: 'POST',
    }),
    env,
  );
  expect(api.status).toBe(503);
  expect(assets.fetch).toHaveBeenCalledOnce();

  env.MAINTENANCE_MODE = undefined;
  const normal = await handler.fetch(new Request('https://quizmon.test/'), env);
  expect(normal.status).toBe(200);
});

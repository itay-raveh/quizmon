import { spriteCachePlugin } from '@/sprite-cache';

describe('sprite caching', () => {
  it.each(['image/png', 'image/gif', 'image/svg+xml'])(
    'keeps successful %s responses available offline',
    async (contentType) => {
      const response = new Response('sprite', {
        headers: { 'Content-Type': contentType },
      });
      await expect(
        spriteCachePlugin.cacheWillUpdate({ response }),
      ).resolves.toBe(response);
      await expect(
        spriteCachePlugin.cachedResponseWillBeUsed({
          cachedResponse: response,
        }),
      ).resolves.toBe(response);
    },
  );

  it.each([
    [200, 'text/html'],
    [404, 'text/html'],
    [502, 'image/png'],
    [200, 'application/octet-stream'],
  ])(
    'rejects a %s %s response on cache reads and writes',
    async (status, contentType) => {
      const response = new Response('unavailable', {
        headers: { 'Content-Type': String(contentType) },
        status: Number(status),
      });
      await expect(
        spriteCachePlugin.cacheWillUpdate({ response }),
      ).resolves.toBeNull();
      await expect(
        spriteCachePlugin.cachedResponseWillBeUsed({
          cachedResponse: response,
        }),
      ).resolves.toBeNull();
    },
  );

  it('allows a network request when no sprite has been cached', async () => {
    await expect(
      spriteCachePlugin.cachedResponseWillBeUsed({}),
    ).resolves.toBeNull();
  });
});

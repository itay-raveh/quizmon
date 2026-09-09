// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { measureCatalogSprites } from '../scripts/sprite-measurements';
import { createCatalogClient } from '../scripts/update-pokemon-data';

const cornersPng =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGP4////fwYoQGbjAehaAB5CD/EFFLnzAAAAAElFTkSuQmCC';

afterEach(() => vi.restoreAllMocks());

describe('catalog sprite measurements', () => {
  it('measures painted pixels and bounds once for each distinct sprite', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(Buffer.from(cornersPng, 'base64')));
    const measurements = await createCatalogClient().measureSprites([
      '/sprites/pokemon/1.png',
      '/sprites/pokemon/1.png',
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
    );
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(measurements.get('/sprites/pokemon/1.png')).toMatchObject({
      area: 0.25,
      width: 1,
      height: 1,
      centerX: 0.5,
      bottom: 1,
    });
    expect(measurements.get('/sprites/pokemon/1.png')?.pixelPeekFocus).toMatch(
      /^[0-9a-f]{21}$/,
    );
  });

  it('rejects an unavailable sprite through the shared source', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404 }),
    );
    await expect(
      createCatalogClient().measureSprites(['/sprites/pokemon/1.png']),
    ).rejects.toThrow('HTTP 404');
  });

  it('rejects unreadable sprites rather than saving guessed measurements', async () => {
    await expect(
      measureCatalogSprites(['/sprites/pokemon/1.png'], () =>
        Promise.resolve('invalid'),
      ),
    ).rejects.toThrow();
  });
});

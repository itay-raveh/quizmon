// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { measureCatalogSprites } from '../scripts/sprite-measurements';

const cornersPng =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGP4////fwYoQGbjAehaAB5CD/EFFLnzAAAAAElFTkSuQmCC';

describe('catalog sprite measurements', () => {
  it('measures painted pixels and bounds once for each distinct sprite', async () => {
    const load = vi.fn(() => Promise.resolve(cornersPng));
    const measurements = await measureCatalogSprites(
      ['/sprites/pokemon/1.png', '/sprites/pokemon/1.png'],
      load,
    );
    expect(load).toHaveBeenCalledTimes(1);
    expect(measurements.get('/sprites/pokemon/1.png')).toEqual({
      area: 0.25,
      width: 1,
      height: 1,
      centerX: 0.5,
      bottom: 1,
    });
  });

  it('rejects unreadable sprites rather than saving guessed measurements', async () => {
    await expect(
      measureCatalogSprites(['/sprites/pokemon/1.png'], () =>
        Promise.resolve('invalid'),
      ),
    ).rejects.toThrow();
  });
});

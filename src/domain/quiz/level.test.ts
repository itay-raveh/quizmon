import { describe, expect, it } from 'vitest';
import { gameLevels, resolveLevelVariant } from './level';

describe('level variants', () => {
  it.each([
    [{ 1: 'a', 3: 'b', 5: 'c' }, [1, 1, 3, 3, 5]],
    [{ 1: 'a', 3: 'b' }, [1, 1, 3, 3, 3]],
    [{ 3: 'a', 5: 'b' }, [undefined, undefined, 3, 3, 5]],
    [{ 3: 'a' }, [undefined, undefined, 3, 3, 3]],
    [{ 1: 'a', 3: 'b', 4: null }, [1, 1, 3, undefined, undefined]],
    [{}, [undefined, undefined, undefined, undefined, undefined]],
  ] as const)('resolves sparse definitions %j', (variants, expected) => {
    expect(
      gameLevels.map((level) => resolveLevelVariant(variants, level)?.level),
    ).toEqual(expected);
  });

  it('returns the original complete definition without mutating it', () => {
    const variant = Object.freeze({ interaction: 'multi-select' });
    const variants = Object.freeze({ 2: variant });
    expect(resolveLevelVariant(variants, 5)?.variant).toBe(variant);
    expect(resolveLevelVariant(variants, 1)).toBeUndefined();
  });
});

import type { PokemonSprites } from 'pokenode-ts';
import { selectPokemonSprite } from '@/game/sprite';

const sprites = {
  front_default: 'https://example.com/pixel.png',
  other: {
    'official-artwork': {
      front_default: 'https://example.com/artwork.png',
    },
  },
  versions: {},
} as unknown as PokemonSprites;

describe('selectPokemonSprite', () => {
  it('prefers official artwork for the standard mode', () => {
    expect(selectPokemonSprite(sprites, false, 0)).toEqual({
      rendering: 'auto',
      src: 'https://example.com/artwork.png',
    });
  });

  it('uses the supplied random value for a stable random sprite', () => {
    expect(selectPokemonSprite(sprites, true, 0)).toEqual({
      rendering: 'pixelated',
      src: 'https://example.com/pixel.png',
    });
    expect(selectPokemonSprite(sprites, true, 0.99)).toEqual({
      rendering: 'auto',
      src: 'https://example.com/artwork.png',
    });
  });

  it('returns null when no sprite is available', () => {
    expect(selectPokemonSprite({} as PokemonSprites, false, 0.5)).toBeNull();
  });
});

import type { PokemonSprites } from 'pokenode-ts';

export interface SpriteData {
  rendering: 'auto' | 'pixelated';
  src: string;
}

const getBestSprite = (sprites: PokemonSprites): SpriteData | null => {
  const officialArtwork = sprites.other?.['official-artwork']?.front_default;
  const home = sprites.other?.home?.front_default;
  const sprite = sprites.front_default;
  const best = officialArtwork || home || sprite;

  if (!best) return null;
  return { src: best, rendering: best === sprite ? 'pixelated' : 'auto' };
};

const collectSprites = (
  value: unknown,
  path: readonly string[] = [],
): SpriteData[] => {
  if (typeof value === 'string') {
    if (!/^https:\/\//.test(value)) return [];
    const usesArtwork = path.some((part) =>
      ['dream_world', 'home', 'official-artwork'].includes(part),
    );
    return [{ src: value, rendering: usesArtwork ? 'auto' : 'pixelated' }];
  }

  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) =>
    collectSprites(nested, [...path, key]),
  );
};

const getRandomSprite = (
  sprites: PokemonSprites,
  randomValue: number,
): SpriteData | null => {
  const unique = Array.from(
    new Map(
      collectSprites(sprites).map((sprite) => [sprite.src, sprite] as const),
    ).values(),
  );
  const index = Math.min(
    unique.length - 1,
    Math.floor(Math.max(0, randomValue) * unique.length),
  );
  return unique[index] ?? null;
};

export const selectPokemonSprite = (
  sprites: PokemonSprites,
  random: boolean,
  randomValue: number,
) => (random ? getRandomSprite(sprites, randomValue) : getBestSprite(sprites));

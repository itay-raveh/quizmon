import { useMemo } from 'react';
import type { Pokemon, PokemonSprites } from '@/lib/pokemon';

interface SpriteData {
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

const getRandomSprite = (sprites: PokemonSprites): SpriteData | null => {
  const unique = Array.from(
    new Map(
      collectSprites(sprites).map((sprite) => [sprite.src, sprite] as const),
    ).values(),
  );
  return unique[Math.floor(Math.random() * unique.length)] ?? null;
};

interface SpriteProps {
  pokemon: Pokemon;
  random: boolean;
  silhouette: boolean;
}

export const Sprite = ({ pokemon, random, silhouette }: SpriteProps) => {
  const sprite = useMemo(
    () =>
      random
        ? getRandomSprite(pokemon.sprites)
        : getBestSprite(pokemon.sprites),
    [pokemon.sprites, random],
  );

  if (!sprite) {
    return (
      <p className="sprite-error">No image is available for this Pokémon.</p>
    );
  }

  return (
    <div className="sprite-frame">
      <img
        className={`sprite ${silhouette ? 'sprite--silhouette' : ''}`}
        src={sprite.src}
        alt={silhouette ? 'Mystery Pokémon silhouette' : 'Pokémon to identify'}
        width="300"
        height="300"
        style={{ imageRendering: sprite.rendering }}
      />
    </div>
  );
};

import { Container } from '@mantine/core';
import { useModifiers } from 'lib/modifiers/context';
import sample from 'lodash.sample';
import Image from 'next/image';
import type { Pokemon, PokemonSprites, VersionSprites } from 'pokenode-ts';
import { useMemo, type FC } from 'react';

const SPRITE_SIZE = 300 as const;

type ImageRenderingMode = 'pixelated' | 'auto';

interface SpriteData {
  src: string;
  rendering: ImageRenderingMode;
}

const getBestSprite = (sprites: PokemonSprites): SpriteData | null => {
  const officialArtwork = sprites.other?.['official-artwork'].front_default;

  const home = sprites.other?.home.front_default;

  const sprite = sprites.front_default;

  const best = officialArtwork || home || sprite;

  return best
    ? { src: best, rendering: best === sprite ? 'pixelated' : 'auto' }
    : null;
};

type AnyObj<T> = { [s: string]: T } | ArrayLike<T>;

const getStringsFromObject = <T,>(o: AnyObj<T>): string[] =>
  Object.values(o).filter(
    (maybeString) =>
      maybeString instanceof String || typeof maybeString === 'string'
  ) as string[];

const toSpriteDataList = <T,>(
  o: AnyObj<T>,
  rendering: ImageRenderingMode = 'pixelated'
): SpriteData[] => getStringsFromObject(o).map((src) => ({ src, rendering }));

type ValueOf<T> = T[keyof T];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValueOfNested<T> = T extends any ? ValueOf<T> : never;

type GenerationSprites = ValueOf<VersionSprites>;
type SubcategorySprites = ValueOfNested<GenerationSprites>;

const getRandomSprite = (
  sprites: PokemonSprites,
  whosThatPokemon: boolean
): SpriteData => {
  const topLevelSprites = toSpriteDataList({ ...sprites });

  const versionSprites = Object.entries(sprites.versions).flatMap(
    ([generation, generationSprites]: readonly [string, GenerationSprites]) =>
      Object.values(generationSprites).flatMap(
        (subcategorySprites: SubcategorySprites) => {
          // if `whosThatPokemon` mode is on
          // and the generation is one of the ones with non-transparent PNGs
          if (
            whosThatPokemon &&
            ['generation-i', 'generation-ii', 'generation-iii'].includes(
              generation
            )
          )
            // filter out sprites that are not specifically transparent.
            // this is needed because their silhouettes would just be black squares
            subcategorySprites = Object.fromEntries(
              Object.entries(subcategorySprites).filter(([spriteName]) =>
                spriteName.includes('transparent')
              )
            ) as SubcategorySprites;

          return toSpriteDataList({ ...subcategorySprites });
        }
      )
  );

  const allSprites: SpriteData[] = [...topLevelSprites, ...versionSprites];

  const other = sprites.other;

  if (other) {
    allSprites.push(
      ...[
        ...toSpriteDataList({ ...other['official-artwork'] }, 'auto'),
        ...toSpriteDataList({ ...other.home }, 'auto'),
      ]
    );
  }

  return sample(allSprites) as SpriteData;
};

interface SpriteProps {
  pokemon: Pokemon;
}

const Sprite: FC<SpriteProps> = ({ pokemon }) => {
  const modifiers = useModifiers();

  const sprite = useMemo(
    () =>
      modifiers.randomSprite
        ? getRandomSprite(pokemon.sprites, modifiers.whosThatPokemon)
        : getBestSprite(pokemon.sprites),
    [modifiers.randomSprite, modifiers.whosThatPokemon, pokemon.sprites]
  );

  if (!sprite) return <section>No sprite for this Pokemon</section>;

  return (
    <Container
      sx={{
        width: '16rem',
        maxWidth: '60vw',
      }}
    >
      <Image
        src={sprite.src}
        alt={pokemon.name}
        width={SPRITE_SIZE}
        height={SPRITE_SIZE}
        style={{
          filter: modifiers.whosThatPokemon
            ? 'brightness(0%)'
            : 'drop-shadow(0px 0px 10px #000)',
          imageRendering: sprite.rendering,
        }}
      />
    </Container>
  );
};

export default Sprite;

import Image from 'next/image';
import type { Pokemon } from 'pokenode-ts';
import type { FC } from 'react';

const SPRITE_SIZE = 300 as const;

interface SpriteProps {
  pokemon: Pokemon;
}

const Sprite: FC<SpriteProps> = ({ pokemon }) => {

  if (isLoading)
    return (
      <Center sx={{ width: SPRITE_SIZE, height: SPRITE_SIZE }}>
        <Loader size='xl' />
      </Center>
    );

  const best =
    pokemon?.sprites.other?.['official-artwork'].front_default ||
    pokemon?.sprites.other?.home.front_default ||
    pokemon?.sprites.front_default;

  if (!best) return <section>No sprite for this Pokemon</section>;

  return (
    <Image
      src={best}
      alt={pokemon.name}
      width={SPRITE_SIZE}
      height={SPRITE_SIZE}
      style={{
        filter: 'drop-shadow(0px 0px 10px #000)',
        // imageRendering: 'pixelated',
      }}
    />
  );
};

export default Sprite;

import { Center, Loader } from '@mantine/core';
import { pokeapi } from 'lib/pokeapi';
import Image from 'next/future/image';
import type { PokemonForm } from 'pokenode-ts';
import type { FC } from 'react';
import { useQuery } from 'react-query';

export const SPRITE_SIZE = 300 as const;

interface SpriteProps {
  pokemonForm: PokemonForm;
}

const Sprite: FC<SpriteProps> = ({ pokemonForm }) => {
  const { isLoading, data: pokemon } = useQuery(
    ['pokemon', pokemonForm.name],
    () => pokeapi.pokemon.getPokemonByName(pokemonForm.name)
  );

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
      alt={pokemonForm.name}
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

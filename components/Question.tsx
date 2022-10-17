import { Modifiers } from 'lib/models/Modifiers';
import { pokeapi } from 'lib/pokeapi';
import Image from 'next/future/image';
import type { FC } from 'react';
import { useQuery } from 'react-query';

interface QuestionProps {
  pokemonName: string;
  pokemonNameList: (string | undefined)[];
  modifiers: Modifiers;
}

const Question: FC<QuestionProps> = ({ pokemonName }) => {
  const { data: pokemon } = useQuery(['pokemon', pokemonName], () =>
    pokeapi.pokemon.getPokemonByName(pokemonName)
  );

  if (!pokemon) return <section>No such Pokemon</section>;

  const image = pokemon.sprites.other?.['official-artwork'].front_default;

  if (!image) return <section>No sprite for this Pokemon</section>;

  return (
    <section>
      <Image
        src={image}
        alt={pokemon.name}
        width='300'
        height='300'
        // style={{ filter: 'contrast(0%) brightness(0%)' }}
      />
    </section>
  );
};

export default Question;

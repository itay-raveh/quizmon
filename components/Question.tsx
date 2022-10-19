import { Button, Center, Group, Loader, Stack } from '@mantine/core';
import { pokeapi } from 'lib/pokeapi';
import startCase from 'lodash.startcase';
import { FC } from 'react';
import { useQuery } from 'react-query';
import Sprite, { SPRITE_SIZE } from './Sprite';

export interface QuestionProps {
  pokemonFormName: string;
  pokemonFormNameList: string[];
  options: string[];
}

const Question: FC<QuestionProps> = ({ pokemonFormName, options }) => {
  const { isLoading, data: pokemonForm } = useQuery(
    ['pokemon-form', pokemonFormName],
    () => pokeapi.pokemon.getPokemonFormByName(pokemonFormName)
  );

  if (isLoading)
    return (
      <Center sx={{ width: SPRITE_SIZE + 50, height: SPRITE_SIZE + 50 }}>
        <Loader size='xl' />
      </Center>
    );

  if (!pokemonForm) return <section>No such pokemon</section>;

  return (
    <section>
      <Stack align='center'>
        <Sprite pokemonForm={pokemonForm} />
        <Group>
          {options.map((option) => (
            <Button key={option}>{startCase(option)}</Button>
          ))}
        </Group>
      </Stack>
    </section>
  );
};

export default Question;

import { Button, Center, Group, Loader, Stack, Text } from '@mantine/core';
import { pokeapi } from 'lib/pokeapi';
import { formatStopwatch } from 'lib/utils';
import startCase from 'lodash.startcase';
import { useState, type FC } from 'react';
import { useQuery } from 'react-query';
import type { StopwatchResult } from 'react-timer-hook';
import Sprite, { SPRITE_SIZE } from './Sprite';

export interface QuestionProps {
  pokemonFormName: string;
  pokemonFormNameList: string[];
  options: string[];
  nextQuestion: (correct: boolean) => void;
  stopwatch: StopwatchResult;
}

const Question: FC<QuestionProps> = ({
  pokemonFormName,
  options,
  nextQuestion,
  stopwatch,
}) => {
  const { isLoading, data: pokemonForm } = useQuery(
    ['pokemon-form', pokemonFormName],
    () => pokeapi.pokemon.getPokemonFormByName(pokemonFormName)
  );

  const [clickedOption, setClickedOption] = useState('');

  if (isLoading)
    return (
      <Center sx={{ width: SPRITE_SIZE + 50, height: SPRITE_SIZE + 50 }}>
        <Loader size='xl' />
      </Center>
    );

  if (!pokemonForm) return <section>No such pokemon</section>;

  const getColor = (option: string) => {
    // if no button was clicked yet
    if (!clickedOption)
      // all buttons are normal
      // (undefined means default from theme)
      return undefined;

    // if this is the correct option
    if (option === pokemonFormName)
      // mark it as correct
      return 'green';

    // if this is NOT the correct option,
    // but it was clicked
    if (option === clickedOption)
      // mark it as incorrect
      return 'red';
  };

  return (
    <section>
      <Stack align='center'>
        <Text size='xl' weight={700}>
          {formatStopwatch(stopwatch)}
        </Text>
        <Sprite pokemonForm={pokemonForm} />
        <Group>
          {options.map((option) => (
            <Button
              key={option}
              size='lg'
              onClick={() => !clickedOption && setClickedOption(option)}
              color={getColor(option)}
            >
              {startCase(option)}
            </Button>
          ))}
        </Group>
        <Button
          disabled={!clickedOption}
          onClick={() => nextQuestion(clickedOption === pokemonFormName)}
        >
          Next
        </Button>
      </Stack>
    </section>
  );
};

export default Question;

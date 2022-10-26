import { Button, Group, Loader, Stack, Text } from '@mantine/core';
import { pokeapi } from 'lib/pokeapi';
import { formatStopwatch } from 'lib/utils';
import startCase from 'lodash.startcase';
import { useState, type FC } from 'react';
import { useQuery } from 'react-query';
import type { StopwatchResult } from 'react-timer-hook';
import Sprite from './Sprite';

export interface QuestionProps {
  pokemonName: string;
  options: string[];
  stopwatch: StopwatchResult;
  nextQuestion: (correct: boolean) => void;
}

const Question: FC<QuestionProps> = ({
  pokemonName,
  options,
  stopwatch,
  nextQuestion,
}) => {
  const { isLoading, data: pokemon } = useQuery(['pokemon', pokemonName], () =>
    pokeapi.pokemon.getPokemonByName(pokemonName)
  );

  const [clickedOption, setClickedOption] = useState('');

  if (isLoading) return <Loader size='xl' />;

  if (!pokemon) return <section>No such pokemon</section>;

  const getColor = (option: string) => {
    // if no button was clicked yet
    if (!clickedOption)
      // all buttons are normal
      // (undefined means default from theme)
      return undefined;

    // if this is the correct option
    if (option === pokemonName)
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
        <Sprite pokemon={pokemon} />
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
          onClick={() => nextQuestion(clickedOption === pokemonName)}
        >
          Next
        </Button>
      </Stack>
    </section>
  );
};

export default Question;

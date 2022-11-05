import {
  Center,
  createStyles,
  Grid,
  Group,
  Loader,
  Stack,
  Title,
} from '@mantine/core';
import { pokeapi } from 'lib/pokeapi';
import { formatStopwatch } from 'lib/utils';
import startCase from 'lodash.startcase';
import { useState, type FC } from 'react';
import { useQuery } from 'react-query';
import type { StopwatchResult } from 'react-timer-hook';
import Button from './Button';
import Sprite from './Sprite';

const useStyles = createStyles(() => ({
  options: {
    width: '20rem',
    maxWidth: '90vw',
  },

  optionButton: {
    width: '100%',
  },
}));

export interface QuestionProps {
  pokemonName: string;
  options: string[];
  stopwatch: StopwatchResult;
  nextQuestion: (correct: boolean) => void;
  final: boolean;
}

const Question: FC<QuestionProps> = ({
  pokemonName,
  options,
  stopwatch,
  nextQuestion,
  final,
}) => {
  const { classes } = useStyles();

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
    <Center sx={{ height: '85vh' }}>
      <Stack align='center'>
        <Text size='xl' weight={700}>
          {formatStopwatch(stopwatch)}
        </Text>
        <Sprite pokemon={pokemon} />
        <Grid className={classes.options}>
          {options.map((option) => (
            <Grid.Col key={option} xs={12} sm={6} md={3}>
              <Button
                className={classes.optionButton}
                onClick={() => {
                  if (!clickedOption) setClickedOption(option);
                  if (final) stopwatch.pause();
                }}
                color={getColor(option)}
              >
                {startCase(option)}
              </Button>
            </Grid.Col>
          ))}
        </Grid>
        <Button
          disabled={!clickedOption}
          onClick={() => nextQuestion(clickedOption === pokemonName)}
        >
          Next
        </Button>
      </Stack>
    </Center>
  );
};

export default Question;

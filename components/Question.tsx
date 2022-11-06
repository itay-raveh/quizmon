import {
  Center,
  createStyles,
  Grid,
  Group,
  Loader,
  Stack,
  Title,
} from '@mantine/core';
import { showErrorNotification } from 'lib/notifications';
import { pokeapi } from 'lib/pokeapi';
import { formatStopwatch } from 'lib/utils';
import startCase from 'lodash.startcase';
import { useState, type FC } from 'react';
import { useQuery } from 'react-query';
import type { StopwatchResult } from 'react-timer-hook';
import Button from './Button';
import Sprite from './Sprite';

const useStyles = createStyles((theme) => ({
  navGroup: {
    width: '14rem',

    [theme.fn.smallerThan('xs')]: {
      width: '90vw',
    },
  },

  options: {
    maxWidth: '90%',
  },

  optionButton: {
    width: '100%',

    [theme.fn.largerThan('sm')]: {
      height: '3rem',
      fontSize: '1rem',
    },
  },
}));

export interface QuestionProps {
  questionNumber: number;
  pokemonName: string;
  options: string[];
  stopwatch: StopwatchResult;
  nextQuestion: (correct: boolean) => void;
  final: boolean;
  newGame: () => void;
}

const Question: FC<QuestionProps> = ({
  questionNumber,
  pokemonName,
  options,
  stopwatch,
  nextQuestion,
  final,
  newGame,
}) => {
  const { classes } = useStyles();

  const { isLoading, data: pokemon } = useQuery(['pokemon', pokemonName], () =>
    pokeapi.pokemon.getPokemonByName(pokemonName)
  );

  const [clickedOption, setClickedOption] = useState('');

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
        <Title order={1} mt='xl'>
          Question #{String(questionNumber).padStart(3, '0')}
        </Title>
        <Title order={4}>Current time: {formatStopwatch(stopwatch)}</Title>
        {!pokemon || isLoading ? (
          <Loader
            size='xl'
            sx={{
              height: '15rem',
              maxHeight: '60vw',
            }}
          />
        ) : (
          <Sprite pokemon={pokemon} />
        )}
        <Center>
          <Grid className={classes.options}>
            {options.map((option) => (
              <Grid.Col key={option} xs={12} sm={6}>
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
        </Center>
        <Group className={classes.navGroup} grow>
          <Button variant='light' onClick={newGame}>
            New Game
          </Button>
          <Button
            color='blue.9'
            onClick={() =>
              clickedOption
                ? nextQuestion(clickedOption === pokemonName)
                : showErrorNotification(
                    'You have to answer the question first...'
                  )
            }
          >
            Next Question
          </Button>
        </Group>
      </Stack>
    </Center>
  );
};

export default Question;

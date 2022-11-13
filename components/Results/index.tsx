import { Center, Stack, Title } from '@mantine/core';
import { useModifiers } from 'lib/modifiers/context';
import { formatStopwatch } from 'lib/utils';
import type { FC } from 'react';
import type { StopwatchResult } from 'react-timer-hook';
import Button from '../Button';
import Fraction from './Fraction';
import Item from './Item';
import Score from './Score';

interface ResultsProps {
  stopwatch: StopwatchResult;
  questionCount: number;
  correctCount: number;
  newGame: () => void;
}

const Results: FC<ResultsProps> = ({
  stopwatch,
  questionCount,
  correctCount,
  newGame,
}) => {
  const modifiers = useModifiers();
  const accuracy = correctCount ** 3 / questionCount;
  const seconds =
    stopwatch.hours * 3600 + stopwatch.minutes * 60 + stopwatch.seconds;
  const time = questionCount ** 3 / seconds;
  const whosThatPokemon = 1 + +modifiers.whosThatPokemon;
  const randomSprite = 1 + +modifiers.randomSprite;

  return (
    <section>
      <Center sx={{ height: '90vh' }}>
        <Stack sx={{ width: '20rem', maxWidth: '90vw' }}>
          <Title order={1}>Results</Title>
          <Item
            title='Accuracy:'
            value={`${((correctCount / questionCount) * 100).toFixed(2)}%`}
            points={
              <Fraction
                numerator={
                  <>
                    {correctCount}
                    <sup>3</sup>
                  </>
                }
                denominator={questionCount}
              />
            }
          />
          <Item
            title='Time:'
            value={formatStopwatch(stopwatch)}
            multiplier={
              <Fraction
                numerator={
                  <>
                    {questionCount}
                    <sup>3</sup>
                  </>
                }
                denominator={seconds}
              />
            }
          />
          {modifiers.whosThatPokemon && (
            <Item title="Who's That Pokémon?" multiplier={2} />
          )}
          {modifiers.randomSprite && (
            <Item title='Random sprite' multiplier={2} />
          )}
          <Score score={accuracy * time * whosThatPokemon * randomSprite} />
          <Button onClick={newGame}>New Game</Button>
        </Stack>
      </Center>
    </section>
  );
};

export default Results;

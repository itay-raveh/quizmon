import { Center, Group, Stack, Title } from '@mantine/core';
import { formatStopwatch } from 'lib/utils';
import type { FC } from 'react';
import type { StopwatchResult } from 'react-timer-hook';
import Button from './Button';

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
}) => (
  <section>
    <Center sx={{ height: '100vh' }}>
      <Stack>
      Final Time: <strong>{formatStopwatch(stopwatch)}</strong>
    </Title>
    <Title order={2}>
      Score:{' '}
      <strong>
        {(correctCount / questionCount) * 100}% ({correctCount}/{questionCount})
      </strong>
    </Title>
    <Group position='center' mt='xl'>
      <Button onClick={newGame}>New Game</Button>
    </Group>
      </Stack>
    </Center>
  </section>
);

export default Results;

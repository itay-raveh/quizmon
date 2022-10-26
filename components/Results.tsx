import { Button, Group, Title } from '@mantine/core';
import { formatStopwatch } from 'lib/utils';
import type { FC } from 'react';
import { StopwatchResult } from 'react-timer-hook';

interface ResultsProps {
  stopwatch: StopwatchResult;
  questionCount: number;
  correctCount: number;
}

const Results: FC<ResultsProps> = ({
  stopwatch,
  questionCount,
  correctCount,
}) => {
  if (stopwatch.isRunning) stopwatch.pause();

  return (
    <section>
      <Title>Results</Title>
      <Title order={2}>
        Final Time: <strong>{formatStopwatch(stopwatch)}</strong>
      </Title>
      <Title order={2}>
        Score:{' '}
        <strong>
          {(correctCount / questionCount) * 100}% ({correctCount}/
          {questionCount})
        </strong>
      </Title>
      <Group position='center' mt='xl'>
        <Button onClick={() => location.reload()}>Back to home page</Button>
      </Group>
    </section>
  );
};

export default Results;

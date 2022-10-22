import { StopwatchResult } from 'react-timer-hook';

export const formatStopwatch = (stopwatch: StopwatchResult) =>
  [stopwatch.hours, stopwatch.minutes, stopwatch.seconds]
    .map((time) => String(time).padStart(2, '0'))
    .join(':');

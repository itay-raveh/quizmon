import { useCallback, useEffect, useRef, useState } from 'react';

export const useStopwatch = () => {
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);
  const accumulatedMilliseconds = useRef(0);

  const updateElapsed = useCallback(() => {
    const currentMilliseconds = running
      ? accumulatedMilliseconds.current + performance.now() - startedAt.current
      : accumulatedMilliseconds.current;
    setElapsedMilliseconds(currentMilliseconds);
    setElapsedSeconds(Math.floor(currentMilliseconds / 1000));
  }, [running]);

  useEffect(() => {
    if (!running) return;

    updateElapsed();
    const interval = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(interval);
  }, [running, updateElapsed]);

  const start = useCallback(() => {
    startedAt.current = performance.now();
    setRunning(true);
  }, []);

  const pause = useCallback((): number => {
    if (!running) return accumulatedMilliseconds.current;
    accumulatedMilliseconds.current += performance.now() - startedAt.current;
    setRunning(false);
    setElapsedMilliseconds(accumulatedMilliseconds.current);
    setElapsedSeconds(Math.floor(accumulatedMilliseconds.current / 1000));
    return accumulatedMilliseconds.current;
  }, [running]);

  const reset = useCallback((elapsedMilliseconds = 0) => {
    const normalizedMilliseconds = Math.max(0, elapsedMilliseconds);
    accumulatedMilliseconds.current = normalizedMilliseconds;
    startedAt.current = performance.now();
    setElapsedMilliseconds(normalizedMilliseconds);
    setElapsedSeconds(Math.floor(normalizedMilliseconds / 1000));
    setRunning(false);
  }, []);

  const getElapsedMilliseconds = useCallback(
    () =>
      running
        ? accumulatedMilliseconds.current +
          performance.now() -
          startedAt.current
        : accumulatedMilliseconds.current,
    [running],
  );

  return {
    elapsedMilliseconds,
    elapsedSeconds,
    getElapsedMilliseconds,
    pause,
    reset,
    start,
  };
};

import { useCallback, useRef, useState } from 'react';

export const useStopwatch = () => {
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);
  const accumulatedMilliseconds = useRef(0);

  const getElapsedMilliseconds = useCallback(
    () =>
      running
        ? accumulatedMilliseconds.current +
          performance.now() -
          startedAt.current
        : accumulatedMilliseconds.current,
    [running],
  );

  const start = useCallback(() => {
    startedAt.current = performance.now();
    setRunning(true);
  }, []);

  const pause = useCallback((): number => {
    if (!running) return accumulatedMilliseconds.current;
    accumulatedMilliseconds.current += performance.now() - startedAt.current;
    setRunning(false);
    return accumulatedMilliseconds.current;
  }, [running]);

  const reset = useCallback((elapsedMilliseconds = 0) => {
    const normalizedMilliseconds = Math.max(0, elapsedMilliseconds);
    accumulatedMilliseconds.current = normalizedMilliseconds;
    startedAt.current = performance.now();
    setRunning(false);
  }, []);

  return {
    getElapsedMilliseconds,
    pause,
    reset,
    running,
    start,
  };
};

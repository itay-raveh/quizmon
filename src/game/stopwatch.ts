import { useCallback, useEffect, useRef, useState } from 'react';

export const useStopwatch = (showMilliseconds = false) => {
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
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

  useEffect(() => {
    if (!running) return;

    const updateElapsed = () =>
      setElapsedMilliseconds(getElapsedMilliseconds());
    updateElapsed();
    const interval = window.setInterval(
      updateElapsed,
      showMilliseconds ? 50 : 250,
    );
    return () => window.clearInterval(interval);
  }, [getElapsedMilliseconds, running, showMilliseconds]);

  const start = useCallback(() => {
    startedAt.current = performance.now();
    setRunning(true);
  }, []);

  const pause = useCallback((): number => {
    if (!running) return accumulatedMilliseconds.current;
    accumulatedMilliseconds.current += performance.now() - startedAt.current;
    setRunning(false);
    setElapsedMilliseconds(accumulatedMilliseconds.current);
    return accumulatedMilliseconds.current;
  }, [running]);

  const reset = useCallback((elapsedMilliseconds = 0) => {
    const normalizedMilliseconds = Math.max(0, elapsedMilliseconds);
    accumulatedMilliseconds.current = normalizedMilliseconds;
    startedAt.current = performance.now();
    setElapsedMilliseconds(normalizedMilliseconds);
    setRunning(false);
  }, []);

  return {
    elapsedMilliseconds,
    elapsedSeconds: Math.floor(elapsedMilliseconds / 1000),
    getElapsedMilliseconds,
    pause,
    reset,
    start,
  };
};

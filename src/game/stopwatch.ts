import { useCallback, useEffect, useRef, useState } from 'react';

export const useStopwatch = (showMilliseconds = false) => {
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);
  const accumulatedMilliseconds = useRef(0);

  const updateElapsed = useCallback(() => {
    const currentMilliseconds = running
      ? accumulatedMilliseconds.current + performance.now() - startedAt.current
      : accumulatedMilliseconds.current;
    setElapsedMilliseconds(currentMilliseconds);
  }, [running]);

  useEffect(() => {
    if (!running) return;

    updateElapsed();
    const interval = window.setInterval(
      updateElapsed,
      showMilliseconds ? 50 : 250,
    );
    return () => window.clearInterval(interval);
  }, [running, showMilliseconds, updateElapsed]);

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
    elapsedSeconds: Math.floor(elapsedMilliseconds / 1000),
    getElapsedMilliseconds,
    pause,
    reset,
    start,
  };
};

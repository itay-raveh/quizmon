import { useCallback, useEffect, useRef, useState } from 'react';

export const useStopwatch = () => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);
  const accumulatedMilliseconds = useRef(0);

  const updateElapsed = useCallback(() => {
    const currentMilliseconds = running
      ? accumulatedMilliseconds.current + performance.now() - startedAt.current
      : accumulatedMilliseconds.current;
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

  const pause = useCallback(() => {
    if (!running) return;
    accumulatedMilliseconds.current += performance.now() - startedAt.current;
    setRunning(false);
    setElapsedSeconds(Math.floor(accumulatedMilliseconds.current / 1000));
  }, [running]);

  const reset = useCallback(() => {
    accumulatedMilliseconds.current = 0;
    startedAt.current = performance.now();
    setElapsedSeconds(0);
    setRunning(false);
  }, []);

  return { elapsedSeconds, pause, reset, start };
};

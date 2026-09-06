import { useEffect, useState } from 'react';
import { useReducedMotion } from './motion';

interface AnimatedScoreProps {
  duration?: number;
  format: (value: number) => string;
  value: number;
}

export const AnimatedScore = ({
  duration = 1600,
  format,
  value,
}: AnimatedScoreProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const startedAt = performance.now();
    let frame = 0;

    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      setDisplayValue(value * easedProgress);

      if (progress < 1) frame = window.requestAnimationFrame(update);
    };

    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, reducedMotion, value]);

  return <>{format(reducedMotion ? value : displayValue)}</>;
};

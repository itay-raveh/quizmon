import { useEffect, useState } from 'react';
import { useReducedMotion } from './motion';

interface AnimatedScoreProps {
  format: (value: number) => string;
  value: number;
}

export const AnimatedScore = ({ format, value }: AnimatedScoreProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const startedAt = performance.now();
    let frame = 0;

    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / 1600, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      setDisplayValue(value * easedProgress);

      if (progress < 1) frame = window.requestAnimationFrame(update);
    };

    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion, value]);

  return format(reducedMotion ? value : displayValue);
};

import { useReducedMotion } from '@/app/providers/motion-context';
import type { SoundControls } from '@/lib/audio/sound-context';
import { useEffect, useState } from 'react';

interface AnimatedScoreProps {
  duration?: number;
  playSound?: SoundControls['playScoreCount'];
  format: (value: number) => string;
  value: number;
}

export const AnimatedScore = ({
  duration = 2000,
  format,
  playSound,
  value,
}: AnimatedScoreProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || value === 0) return;

    const playback = !document.hidden ? playSound?.() : undefined;

    const startedAt = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      setDisplayValue(Math.round(value * progress));

      if (progress < 1) frame = window.requestAnimationFrame(update);
    };

    const finishWhenHidden = () => {
      if (!document.hidden) return;
      playback?.stop();
      window.cancelAnimationFrame(frame);
      setDisplayValue(value);
    };
    if (document.hidden) finishWhenHidden();
    else frame = window.requestAnimationFrame(update);
    document.addEventListener('visibilitychange', finishWhenHidden);
    return () => {
      playback?.stop();
      window.cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', finishWhenHidden);
    };
  }, [duration, playSound, reducedMotion, value]);

  return format(reducedMotion || value === 0 ? value : displayValue);
};

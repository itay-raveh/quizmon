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
  duration = 1600,
  format,
  playSound,
  value,
}: AnimatedScoreProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const playback = value > 0 && !document.hidden ? playSound?.() : undefined;

    const startedAt = performance.now();
    let frame = 0;

    const update = (now: number) => {
      const progress =
        playback?.progress(800) ?? Math.min((now - startedAt) / duration, 1);
      const easedProgress = playback ? progress : 1 - (1 - progress) ** 3;
      setDisplayValue(
        progress < 1
          ? Math.max(0, Math.min(value - 1, Math.floor(value * easedProgress)))
          : value,
      );

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

  return format(reducedMotion ? value : displayValue);
};

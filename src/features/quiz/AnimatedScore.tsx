import { useReducedMotion } from '@/app/providers/motion-context';
import type { SoundControls } from '@/lib/audio/sound-context';
import { useEffect, useState } from 'react';

interface AnimatedScoreProps {
  checkpoints?: readonly number[];
  duration?: number;
  onCheckpoint?: (index: number) => void;
  playSound?: SoundControls['playScoreCount'];
  format: (value: number) => string;
  value: number;
}

export const AnimatedScore = ({
  checkpoints,
  duration = 1600,
  format,
  onCheckpoint,
  playSound,
  value,
}: AnimatedScoreProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const checkpointCount = Math.max(0, (checkpoints?.length ?? 0) - 1);
    if (reducedMotion || value === 0) {
      onCheckpoint?.(checkpointCount);
      return;
    }

    const playback = !document.hidden ? playSound?.() : undefined;

    const startedAt = performance.now();
    let frame = 0;
    let lastCheckpoint = -1;

    const update = (now: number) => {
      const progress =
        playback?.progress(800) ?? Math.min((now - startedAt) / duration, 1);
      if (checkpointCount && checkpoints) {
        const position = progress * checkpointCount;
        const index = Math.min(Math.floor(position), checkpointCount - 1);
        const from = checkpoints[index]!;
        const to = checkpoints[index + 1]!;
        const localProgress = position - index;
        const easedProgress = 1 - (1 - localProgress) ** 3;
        setDisplayValue(
          progress < 1 ? Math.round(from + (to - from) * easedProgress) : value,
        );
        const active = progress < 1 ? index : checkpointCount;
        if (active !== lastCheckpoint) {
          onCheckpoint?.(active);
          lastCheckpoint = active;
        }
      } else {
        const easedProgress = playback ? progress : 1 - (1 - progress) ** 3;
        setDisplayValue(
          progress < 1
            ? Math.max(
                0,
                Math.min(value - 1, Math.floor(value * easedProgress)),
              )
            : value,
        );
      }

      if (progress < 1) frame = window.requestAnimationFrame(update);
    };

    const finishWhenHidden = () => {
      if (!document.hidden) return;
      playback?.stop();
      window.cancelAnimationFrame(frame);
      setDisplayValue(value);
      onCheckpoint?.(checkpointCount);
    };
    if (document.hidden) finishWhenHidden();
    else frame = window.requestAnimationFrame(update);
    document.addEventListener('visibilitychange', finishWhenHidden);
    return () => {
      playback?.stop();
      window.cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', finishWhenHidden);
    };
  }, [checkpoints, duration, onCheckpoint, playSound, reducedMotion, value]);

  return format(reducedMotion || value === 0 ? value : displayValue);
};

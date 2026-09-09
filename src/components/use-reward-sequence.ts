import { useEffect, useRef, useState } from 'react';
import { useGameSounds } from '@/audio/sound';
import type { TrainerProgressChange } from '@/game/trainer';
import { useReducedMotion } from './motion';

const rewardStarts = (count: number) => {
  let next = 180;
  const starts = Array.from({ length: count }, (_, index) => {
    const start = next;
    next += Math.max(75, 180 - index * 18);
    return start;
  });
  const span = (starts.at(-1) ?? 180) - 180;
  return span > 850
    ? starts.map((start) => 180 + ((start - 180) * 850) / span)
    : starts;
};

export const useRewardSequence = (changes: TrainerProgressChange[]) => {
  const reducedMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const sounds = useGameSounds();
  const latestSounds = useRef(sounds);
  useEffect(() => {
    latestSounds.current = sounds;
  }, [sounds]);

  useEffect(() => {
    if (reducedMotion || changes.length === 0) return;
    const starts = rewardStarts(changes.length);
    const hasGold = changes.some(
      (change) => change.earned && change.tier === 3,
    );
    const end = (starts.at(-1) ?? 0) + (hasGold ? 870 : 650);
    const startedAt = performance.now();
    const credited = new Set<number>();
    const unlocked = new Set<number>();
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      latestSounds.current.stopRewards();
      setElapsed(Infinity);
    };
    const update = (now: number) => {
      const time = now - startedAt;
      changes.forEach((change, index) => {
        const local = time - starts[index]!;
        if (local >= 0 && !credited.has(index)) {
          latestSounds.current.playReward(index, 'gain');
          credited.add(index);
        }
        if (
          change.earned &&
          change.tier === 3 &&
          local >= 500 &&
          !unlocked.has(index)
        ) {
          latestSounds.current.playReward(index, 'gold');
          unlocked.add(index);
        }
      });
      if (time < end) {
        setElapsed(time);
        frame = requestAnimationFrame(update);
      } else {
        setElapsed(Infinity);
        if (unlocked.size === 0) latestSounds.current.playReward(0, 'complete');
      }
    };
    const onVisibility = () => {
      if (document.hidden) finish();
    };
    if (document.hidden) finish();
    else frame = requestAnimationFrame(update);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      latestSounds.current.stopRewards();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [changes, reducedMotion]);

  return {
    elapsed: reducedMotion ? Infinity : elapsed,
    starts: rewardStarts(changes.length),
  };
};

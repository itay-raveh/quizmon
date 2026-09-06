import { useEffect, useRef } from 'react';
import sheen01 from '@/assets/images/trainer-card/sheen-01.png';
import sheen02 from '@/assets/images/trainer-card/sheen-02.png';
import sheen03 from '@/assets/images/trainer-card/sheen-03.png';
import sheen04 from '@/assets/images/trainer-card/sheen-04.png';
import sheen05 from '@/assets/images/trainer-card/sheen-05.png';
import sheen06 from '@/assets/images/trainer-card/sheen-06.png';
import sheen07 from '@/assets/images/trainer-card/sheen-07.png';
import sheen08 from '@/assets/images/trainer-card/sheen-08.png';
import sheen09 from '@/assets/images/trainer-card/sheen-09.png';
import sheen10 from '@/assets/images/trainer-card/sheen-10.png';
import type { CardFinish } from '@/game/trainer';
import { useReducedMotion } from './motion';

const sheenFrames = [
  sheen01,
  sheen02,
  sheen03,
  sheen04,
  sheen05,
  sheen06,
  sheen07,
  sheen08,
  sheen09,
  sheen10,
] as const;

const firstSheenFrame = sheenFrames[0];
const staticSheenFrame = sheenFrames[5];

const motionByFinish = {
  Bronze: { frameMs: 68, initialDelayMs: 150 },
  Gold: { frameMs: 49, initialDelayMs: 710 },
  Silver: { frameMs: 58, initialDelayMs: 430 },
} as const;

const loopGapMs = 1100;

interface TrainerCardFinishEffectsProps {
  finish: CardFinish;
  sparkles?: boolean;
}

export const TrainerCardFinishEffects = ({
  finish,
  sparkles = false,
}: TrainerCardFinishEffectsProps) => {
  const reduceMotion = useReducedMotion();
  const effectsRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (finish === 'Classic') return;

    const effects = effectsRef.current;
    const sheen = sheenRef.current;
    if (!effects || !sheen) return;

    sheenFrames.forEach((src) => {
      const image = new Image();
      image.src = src;
    });

    const motion = motionByFinish[finish];
    let isIntersecting = true;
    let timer: number | undefined;

    const clearTimer = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    };

    const reset = () => {
      clearTimer();
      effects.classList.remove('is-motion-active', 'is-static');
      sheen.classList.remove('is-active');
      sheen.src = firstSheenFrame;
    };

    const showStaticFinish = () => {
      reset();
      effects.classList.add('is-static');
      sheen.src = staticSheenFrame;
      sheen.classList.add('is-active');
    };

    const playPass = () => {
      if (document.hidden || !isIntersecting || reduceMotion) return;

      let frame = 0;
      effects.classList.add('is-motion-active');
      sheen.src = firstSheenFrame;
      sheen.classList.add('is-active');

      const advance = () => {
        const nextFrame = sheenFrames[++frame];
        if (!nextFrame) {
          sheen.classList.remove('is-active');
          sheen.src = firstSheenFrame;
          timer = window.setTimeout(playPass, loopGapMs);
          return;
        }

        sheen.src = nextFrame;
        timer = window.setTimeout(advance, motion.frameMs);
      };

      timer = window.setTimeout(advance, motion.frameMs);
    };

    const updateMotion = () => {
      reset();
      if (document.hidden || !isIntersecting) return;
      if (reduceMotion) {
        showStaticFinish();
        return;
      }

      effects.classList.add('is-motion-active');
      timer = window.setTimeout(playPass, motion.initialDelayMs);
    };

    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(([entry]) => {
            if (!entry) return;
            isIntersecting = entry.isIntersecting;
            updateMotion();
          })
        : null;

    observer?.observe(effects);
    document.addEventListener('visibilitychange', updateMotion);
    updateMotion();

    return () => {
      reset();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updateMotion);
    };
  }, [finish, reduceMotion]);

  if (finish === 'Classic') return null;

  return (
    <div
      ref={effectsRef}
      aria-hidden="true"
      className="trainer-card__finish-effects"
    >
      <img
        ref={sheenRef}
        alt=""
        className="trainer-card__sheen"
        draggable="false"
        src={firstSheenFrame}
      />
      {sparkles ? (
        <>
          <span className="trainer-card__sparkle trainer-card__sparkle--one" />
          <span className="trainer-card__sparkle trainer-card__sparkle--two" />
          <span className="trainer-card__sparkle trainer-card__sparkle--three" />
        </>
      ) : null}
    </div>
  );
};

import { useReducedMotion } from '@/app/providers/motion-context';
import type { CardFinish } from '@/domain/player/trainer-progression';
import { useEffect, useRef } from 'react';

interface TrainerCardFinishEffectsProps {
  finish: CardFinish;
  polished?: boolean;
}

export const TrainerCardFinishEffects = ({
  finish,
  polished = false,
}: TrainerCardFinishEffectsProps) => {
  const reduceMotion = useReducedMotion();
  const effectsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const effects = effectsRef.current;
    if (!effects) return;
    let isIntersecting = true;
    const updateMotion = () => {
      const visible = !document.hidden && isIntersecting;
      effects.classList.toggle('is-motion-active', visible && !reduceMotion);
      effects.classList.toggle('is-static', visible && reduceMotion);
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
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updateMotion);
    };
  }, [finish, reduceMotion, polished]);

  if (finish === 'Classic') return null;

  return (
    <div
      ref={effectsRef}
      aria-hidden="true"
      className="trainer-card__finish-effects"
    >
      {polished ? (
        <div className="trainer-card__polish" />
      ) : (
        <div className="trainer-card__sheen" />
      )}
    </div>
  );
};

import * as styles from './styles/classes.css.ts';
import type { TrainerBadge } from '@/domain/player/trainer-progression';

interface TrainerTierProgressProps {
  progress: Pick<TrainerBadge, 'label' | 'current' | 'goal' | 'tier'>;
}

export const TrainerTierProgress = ({
  progress: { label, current, goal, tier },
}: TrainerTierProgressProps) => {
  if (tier === 3) {
    return (
      <strong className={styles.trainerProgressTotal}>
        {current.toLocaleString()}
      </strong>
    );
  }

  return (
    <div className={styles.trainerProgress}>
      <div className={styles.trainerProgressNumbers}>
        <strong>{current.toLocaleString()}</strong>{' '}
        <span>/ {goal.toLocaleString()}</span>
      </div>
      <progress
        aria-label={`${label} progress`}
        max={goal}
        value={Math.min(current, goal)}
      />
    </div>
  );
};

import type { TrainerBadge } from '@/game/trainer';

interface TrainerTierProgressProps {
  progress: Pick<TrainerBadge, 'label' | 'current' | 'goal' | 'tier'>;
}

export const TrainerTierProgress = ({
  progress: { label, current, goal, tier },
}: TrainerTierProgressProps) => {
  if (tier === 3) {
    return (
      <strong className="trainer-progress-total">
        {current.toLocaleString()}
      </strong>
    );
  }

  return (
    <div className="trainer-progress">
      <div className="trainer-progress__numbers">
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

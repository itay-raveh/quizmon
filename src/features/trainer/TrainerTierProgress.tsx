import { Progress } from '@base-ui/react/progress';
import type { TrainerBadge } from '@/domain/player/trainer-progression';

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
      <Progress.Root
        className="trainer-progress__bar"
        aria-label={`${label} progress`}
        max={goal}
        value={Math.min(current, goal)}
      >
        <Progress.Track>
          <Progress.Indicator className="trainer-progress__fill" />
        </Progress.Track>
      </Progress.Root>
    </div>
  );
};

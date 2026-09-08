import { trainerTierLabels, type TrainerBadge } from '@/game/trainer';

interface TrainerTierProgressProps {
  progress: Pick<
    TrainerBadge,
    'label' | 'current' | 'goal' | 'milestones' | 'tier'
  >;
  completedLabel: string;
  labelClassName: string;
}

export const TrainerTierProgress = ({
  progress: { label, current, goal, milestones, tier },
  completedLabel,
  labelClassName,
}: TrainerTierProgressProps) => {
  const value = Math.min(current, goal);
  return (
    <>
      <div className={labelClassName}>
        <span>
          {tier === 3 ? completedLabel : `Next: ${trainerTierLabels[tier + 1]}`}
        </span>
        <strong>
          {tier === 3
            ? current.toLocaleString()
            : `${value.toLocaleString()} / ${goal.toLocaleString()}`}
        </strong>
      </div>
      <progress aria-label={`${label} progress`} max={goal} value={value} />
      <ol className="trainer-tier-progress" aria-label={`${label} tiers`}>
        {milestones.map(({ current, goal, requirement }, index) => (
          <li
            key={index}
            data-tier={index + 1}
            data-earned={tier > index}
            aria-current={tier === index ? 'step' : undefined}
          >
            <div className="trainer-tier-progress__heading">
              <strong>{trainerTierLabels[index + 1]}</strong>
              <span>
                {tier > index
                  ? 'Earned'
                  : tier === index
                    ? 'Next tier'
                    : `${Math.min(current, goal).toLocaleString()} / ${goal.toLocaleString()}`}
              </span>
            </div>
            <p>{requirement}</p>
          </li>
        ))}
      </ol>
    </>
  );
};

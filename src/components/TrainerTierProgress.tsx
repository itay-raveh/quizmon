import {
  trainerTierLabels,
  type TrainerMilestone,
  type TrainerTier,
} from '@/game/trainer';

interface TrainerTierProgressProps {
  label: string;
  milestones: readonly TrainerMilestone[];
  tier: TrainerTier;
}

export const TrainerTierProgress = ({
  label,
  milestones,
  tier,
}: TrainerTierProgressProps) => (
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
);

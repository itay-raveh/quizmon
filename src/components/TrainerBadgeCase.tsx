import type { TrainerBadge } from '@/game/trainer';
import { TrainerBadgeMark } from './TrainerBadgeMark';

interface TrainerBadgeCaseProps {
  badges: readonly TrainerBadge[];
}

export const TrainerBadgeCase = ({ badges }: TrainerBadgeCaseProps) => {
  const earnedBadgeCount = badges.filter(({ earned }) => earned).length;

  return (
    <section className="trainer-badge-case" aria-labelledby="badge-case-title">
      <header>
        <h2 id="badge-case-title">Badge case</h2>
        <span>{earnedBadgeCount} / 5 earned</span>
      </header>
      <ul>
        {badges.map((badge) => {
          const progress = Math.min(badge.current, badge.goal);
          return (
            <li key={badge.id}>
              <TrainerBadgeMark earned={badge.earned} id={badge.id} />
              <span className="trainer-badge-case__copy">
                <b>{badge.label}</b>
                <small>{badge.requirement}</small>
              </span>
              <span className="trainer-badge-case__progress">
                {badge.earned ? 'Earned' : `${progress} / ${badge.goal}`}
              </span>
              <progress
                aria-label={`${badge.label} progress`}
                max={badge.goal}
                value={progress}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

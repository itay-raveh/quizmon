import { CollectionCorners } from './CollectionCorners';
import type { Ref } from 'react';
import type { TrainerBadge } from '@/game/trainer';
import { SoundButton } from './SoundButton';
import { TrainerBadgeMark } from './TrainerBadgeMark';

interface TrainerBadgeCaseProps {
  badges: TrainerBadge[];
  caseRef?: Ref<HTMLElement>;
  onSelect: (badge: TrainerBadge) => void;
}

export const TrainerBadgeCase = ({
  badges,
  caseRef,
  onSelect,
}: TrainerBadgeCaseProps) => {
  const earnedCount = badges.filter(({ earned }) => earned).length;

  return (
    <article
      ref={caseRef}
      aria-label="League Badge Case"
      className="trainer-badge-case"
    >
      <section
        aria-label={`${earnedCount} of ${badges.length} League Badges earned`}
        className="trainer-badge-case__badges"
      >
        <CollectionCorners className="trainer-badge-case__rivet" />
        {badges.map((badge) => (
          <SoundButton
            aria-label={`${badge.label}. ${badge.earned ? 'Earned' : `Locked, ${Math.min(badge.current, badge.goal)} of ${badge.goal}`}. Open badge details.`}
            className="trainer-badge"
            data-earned={badge.earned}
            key={badge.id}
            onClick={() => onSelect(badge)}
          >
            <TrainerBadgeMark earned={badge.earned} id={badge.id} />
          </SoundButton>
        ))}
      </section>
    </article>
  );
};

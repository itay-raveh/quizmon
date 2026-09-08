import { CollectionCorners } from './CollectionCorners';
import type { Ref } from 'react';
import {
  trainerViewLabels,
  trainerTierLabels,
  type TrainerBadge,
} from '@/game/trainer';
import { SoundButton } from './SoundButton';
import { TrainerBadgeMark } from './TrainerBadgeMark';
import { TrainerArtifactFrame } from './TrainerArtifactFrame';

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
    <TrainerArtifactFrame
      ref={caseRef}
      aria-label={trainerViewLabels.badges}
      className="trainer-badge-case"
    >
      <section
        aria-label={`${earnedCount} of ${badges.length} League Badges earned`}
        className="trainer-badge-case__badges"
      >
        <CollectionCorners className="trainer-badge-case__rivet" />
        {badges.map((badge) => (
          <SoundButton
            aria-label={`${badge.label}. ${badge.earned ? `Earned, ${trainerTierLabels[badge.tier]} tier ${badge.tier}` : `Locked, ${Math.min(badge.current, badge.goal)} of ${badge.goal}`}. Open badge details.`}
            className="trainer-badge"
            data-earned={badge.earned}
            data-tier={badge.tier}
            title={`${badge.label} · ${trainerTierLabels[badge.tier]}`}
            key={badge.id}
            onClick={() => onSelect(badge)}
          >
            <TrainerBadgeMark id={badge.id} tier={badge.tier} />
          </SoundButton>
        ))}
      </section>
    </TrainerArtifactFrame>
  );
};

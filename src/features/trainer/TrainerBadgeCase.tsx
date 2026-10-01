import { SoundButton } from '@/components/SoundButton';
import {
  trainerTierLabels,
  trainerViewLabels,
  type TrainerBadge,
} from '@/domain/player/trainer-progression';
import { CollectionCorners } from './CollectionCorners';
import { TrainerBadgeMark } from './TrainerBadgeMark';

type TrainerBadgeCaseProps =
  | {
      badges: readonly TrainerBadge[];
      compact: true;
      onSelect?: never;
    }
  | {
      badges: readonly TrainerBadge[];
      compact?: false;
      onSelect: (badge: TrainerBadge) => void;
    };

export const TrainerBadgeCase = ({
  badges,
  compact = false,
  onSelect,
}: TrainerBadgeCaseProps) => {
  const earnedCount = badges.filter(({ earned }) => earned).length;

  return (
    <article
      aria-label={compact ? undefined : trainerViewLabels.badges}
      aria-hidden={compact || undefined}
      className={`trainer-artifact-frame trainer-badge-case${compact ? ' trainer-badge-case--compact' : ''}`}
    >
      <section
        aria-label={
          compact
            ? undefined
            : `${earnedCount} of ${badges.length} League Badges earned`
        }
        className="trainer-badge-case__badges"
      >
        <CollectionCorners className="trainer-badge-case__rivet" />
        {badges.map((badge) =>
          compact ? (
            <span
              className="trainer-badge"
              data-earned={badge.earned}
              data-tier={badge.tier}
              key={badge.id}
            >
              <TrainerBadgeMark id={badge.id} tier={badge.tier} />
            </span>
          ) : (
            <SoundButton
              aria-label={`${badge.label}. ${badge.earned ? `Earned, ${trainerTierLabels[badge.tier]} tier ${badge.tier}` : `Locked, ${Math.min(badge.current, badge.goal)} of ${badge.goal}`}. Open badge details.`}
              className="trainer-badge"
              data-earned={badge.earned}
              data-tier={badge.tier}
              title={`${badge.label} · ${trainerTierLabels[badge.tier]}`}
              key={badge.id}
              onClick={() => onSelect?.(badge)}
            >
              <TrainerBadgeMark id={badge.id} tier={badge.tier} />
            </SoundButton>
          ),
        )}
      </section>
    </article>
  );
};

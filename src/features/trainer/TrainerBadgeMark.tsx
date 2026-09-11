import championsInstinct from '@/assets/images/badges/champions-instinct.png';
import dailyResolve from '@/assets/images/badges/daily-resolve.png';
import manyPaths from '@/assets/images/badges/many-paths.png';
import perfectForm from '@/assets/images/badges/perfect-form.png';
import pokedexTrail from '@/assets/images/badges/pokedex-trail.png';
import quickAttack from '@/assets/images/badges/quick-attack.png';
import trueCalling from '@/assets/images/badges/true-calling.png';
import worldTour from '@/assets/images/badges/world-tour.png';
import type {
  TrainerBadgeId,
  TrainerTier,
} from '@/domain/player/trainer-progression';

interface TrainerBadgeMarkProps {
  tier: TrainerTier;
  id: TrainerBadgeId;
}

const badgeImages = {
  'champions-instinct': championsInstinct,
  'daily-resolve': dailyResolve,
  'many-paths': manyPaths,
  'perfect-form': perfectForm,
  'pokedex-trail': pokedexTrail,
  'quick-attack': quickAttack,
  'true-calling': trueCalling,
  'world-tour': worldTour,
} satisfies Record<TrainerBadgeId, string>;

export const TrainerBadgeMark = ({ id, tier }: TrainerBadgeMarkProps) => (
  <span className="trainer-badge-mark" data-earned={tier > 0} data-tier={tier}>
    <img
      aria-hidden="true"
      src={badgeImages[id]}
      alt=""
      width="32"
      height="32"
    />
  </span>
);

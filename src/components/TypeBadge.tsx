import bug from '@/assets/types/bug.png';
import dark from '@/assets/types/dark.png';
import dragon from '@/assets/types/dragon.png';
import electric from '@/assets/types/electric.png';
import fairy from '@/assets/types/fairy.png';
import fighting from '@/assets/types/fighting.png';
import fire from '@/assets/types/fire.png';
import flying from '@/assets/types/flying.png';
import ghost from '@/assets/types/ghost.png';
import grass from '@/assets/types/grass.png';
import ground from '@/assets/types/ground.png';
import ice from '@/assets/types/ice.png';
import normal from '@/assets/types/normal.png';
import poison from '@/assets/types/poison.png';
import psychic from '@/assets/types/psychic.png';
import rock from '@/assets/types/rock.png';
import steel from '@/assets/types/steel.png';
import unknown from '@/assets/types/unknown.png';
import water from '@/assets/types/water.png';

const typeBadgeSources: Record<string, string> = {
  bug,
  dark,
  dragon,
  electric,
  fairy,
  fighting,
  fire,
  flying,
  ghost,
  grass,
  ground,
  ice,
  normal,
  poison,
  psychic,
  rock,
  steel,
  water,
};

interface TypeBadgeProps {
  type: string;
}

interface TypeBadgesProps {
  className?: string;
  label?: string;
  types: readonly string[];
}

interface MysteryTypeBadgeProps {
  className?: string;
}

const TypeBadge = ({ type }: TypeBadgeProps) => {
  const src = typeBadgeSources[type];
  if (!src) return null;

  return (
    <img
      className="type-badge"
      src={src}
      alt=""
      aria-hidden="true"
      width="50"
      height="20"
    />
  );
};

export const MysteryTypeBadge = ({ className = '' }: MysteryTypeBadgeProps) => (
  <img
    aria-hidden="true"
    className={`type-badge type-badge--mystery ${className}`.trim()}
    src={unknown}
    alt=""
    width="50"
    height="20"
  />
);

export const TypeBadges = ({
  className = '',
  label,
  types,
}: TypeBadgesProps) => (
  <span
    aria-hidden={label ? undefined : true}
    aria-label={label}
    className={`type-badges ${className}`.trim()}
    role={label ? 'img' : undefined}
  >
    {types.map((type) => (
      <TypeBadge key={type} type={type} />
    ))}
  </span>
);

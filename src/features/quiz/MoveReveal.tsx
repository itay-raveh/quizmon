import { TypeBadges } from '@/components/TypeBadge';

export const MoveReveal = ({ description }: { description: string }) => {
  const [type, damageClass] = description.split(' · ');
  if (!type || !damageClass) return description;
  return (
    <span className="move-reveal">
      <TypeBadges types={[type.toLowerCase()]} />
      <span>{damageClass}</span>
    </span>
  );
};

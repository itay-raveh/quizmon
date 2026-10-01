import * as styles from './styles/classes.css.ts';
import { TypeBadges } from '@/components/TypeBadge';

export const MoveReveal = ({ description }: { description: string }) => {
  const [type, damageClass] = description.split(' · ');
  if (!type || !damageClass) return description;
  return (
    <span className={styles.moveReveal}>
      <TypeBadges types={[type.toLowerCase()]} />
      <span>{damageClass}</span>
    </span>
  );
};

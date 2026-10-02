import * as styles from './styles/classes.css.ts';
import { StatDirection } from './StatDirection';

export const NatureEffect = ({
  description,
  compact = false,
}: {
  description: string;
  compact?: boolean;
}) => {
  const effect = /^Raises (.+); lowers (.+)$/.exec(description);
  if (!effect) return description;
  return (
    <span
      className={`${styles.natureEffect}${compact ? ` ${styles.natureEffectCompact}` : ''}`}
      aria-label={description}
      role="img"
    >
      <span aria-hidden="true">
        <StatDirection label={effect[1]!} direction="up" compact={compact} />
      </span>
      <span aria-hidden="true">
        <StatDirection label={effect[2]!} direction="down" compact={compact} />
      </span>
    </span>
  );
};

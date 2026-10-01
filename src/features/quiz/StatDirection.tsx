import * as styles from './styles/classes.css.ts';
import { RelationArrow } from './RelationArrow';

export const StatDirection = ({
  label,
  direction,
  compact = false,
}: {
  label: string;
  direction: 'up' | 'down';
  compact?: boolean;
}) => (
  <span
    className={`${styles.statDirection}${compact ? ` ${styles.statDirectionCompact}` : ''}`}
  >
    <strong>{label}</strong>
    <RelationArrow direction={direction} />
  </span>
);

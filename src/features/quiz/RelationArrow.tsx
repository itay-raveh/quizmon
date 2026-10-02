import * as styles from './styles/classes.css.ts';
import { formatTypeMultiplier } from '@/domain/pokemon/format';

export const RelationArrow = ({
  direction = 'right',
}: {
  direction?: 'right' | 'up' | 'down';
}) => (
  <span
    className={`${styles.questionRelationArrow} ${direction === 'up' ? styles.questionRelationArrowUp : direction === 'down' ? styles.questionRelationArrowDown : ''}`.trim()}
  >
    <svg aria-hidden="true" viewBox="0 0 54 32">
      <path d="M2 11h31V4l18 12-18 12v-7H2z" />
    </svg>
  </span>
);

export const TypeEffectArrow = ({ multiplier }: { multiplier: number }) => (
  <span className={styles.questionRelationEffect}>
    <strong>×{formatTypeMultiplier(multiplier)}</strong>
    <RelationArrow />
  </span>
);

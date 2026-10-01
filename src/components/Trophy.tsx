import * as styles from './classes.css.ts';
import trophy from '@/assets/images/trophy.png';

export const Trophy = ({ className = '' }: { className?: string }) => (
  <img
    className={`${styles.trophy} ${className}`.trim()}
    src={trophy}
    alt=""
    aria-hidden="true"
    width="64"
    height="64"
  />
);

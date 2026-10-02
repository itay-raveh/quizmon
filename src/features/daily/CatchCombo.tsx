import * as styles from './CatchCombo.css.ts';

interface CatchComboProps {
  celebrate?: boolean;
  className?: string;
  count: number;
  placement?: 'dailyAction' | 'trainerCard';
}

export const CatchCombo = ({
  celebrate = false,
  className = '',
  count,
  placement,
}: CatchComboProps) => {
  if (count < 1) return null;

  const displayCount = count > 999 ? '999+' : count.toString();
  const trainerCard = placement === 'trainerCard';

  return (
    <div
      aria-label={`${count}-day Daily Combo`}
      className={`${styles.root} ${placement ? styles[placement] : ''} ${className}`.trim()}
      role="img"
    >
      <span
        className={`${styles.ball} ${trainerCard ? styles.trainerBall : ''} ${celebrate ? styles.ballCelebrate : ''}`.trim()}
        aria-hidden="true"
      >
        <span
          className={`${styles.ring} ${celebrate ? styles.ringCelebrate : ''}`.trim()}
        />
        <strong
          className={`${styles.count} ${trainerCard ? styles.trainerCount : ''}`.trim()}
          data-digits={displayCount.length}
        >
          {displayCount}
        </strong>
      </span>
      <span
        className={`${styles.label} ${trainerCard ? styles.trainerLabel : ''}`.trim()}
        aria-hidden="true"
      >
        Day combo
      </span>
    </div>
  );
};

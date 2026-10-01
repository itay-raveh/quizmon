import * as styles from '../../styles/classes.css.ts';
import { Trophy } from '@/components/Trophy';
import {
  trainerTierLabels,
  type TrainerProgressChange,
} from '@/domain/player/trainer-progression';
import { useRewardSequence } from './useRewardSequence';
import type { CSSProperties } from 'react';
import { TrainerBadgeMark } from './TrainerBadgeMark';
import { TrainerTitleMark } from './TrainerTitleMark';

interface TrainerProgressSummaryProps {
  leagueVictory: boolean;
  progressChanges: TrainerProgressChange[];
}

const format = (value: number) => Math.round(value).toLocaleString();

export const TrainerProgressSummary = ({
  leagueVictory,
  progressChanges,
}: TrainerProgressSummaryProps) => {
  const { elapsed, starts } = useRewardSequence(progressChanges);
  if (!leagueVictory && progressChanges.length === 0) return null;

  return (
    <section
      className={styles.rewardCase}
      aria-label="Trainer progress"
      data-playing={Number.isFinite(elapsed)}
    >
      <ul aria-label="Rewards">
        {leagueVictory ? (
          <li>
            <div className={`${styles.reward} ${styles.rewardVictory}`}>
              <Trophy className={styles.rewardHallMark} />
              <span className={styles.rewardBody}>
                <strong className={styles.rewardName}>Hall of Fame</strong>
                <small>League Champion</small>
              </span>
            </div>
          </li>
        ) : null}
        {progressChanges.map((change, index) => {
          const local = elapsed - starts[index]!;
          const celebrating = change.earned;
          const revealed = local >= (celebrating ? 500 : 620);
          const before = change.current - change.delta;
          const progress = Math.max(0, Math.min(1, local / 620));
          const credited = celebrating
            ? local < 500
              ? Math.max(
                  0,
                  Math.min(
                    change.delta - 1,
                    (change.goal - 1 - before) *
                      Math.min(1, Math.max(0, local / 230)),
                  ),
                )
              : change.delta
            : change.delta * (1 - (1 - progress) ** 2);
          const current = before + credited;
          const tier =
            change.earned && !revealed ? change.previousTier : change.tier;
          const unlocked = change.earned && revealed;
          const total =
            change.tier === 3
              ? `${format(change.current)} total`
              : `${format(change.current)} / ${format(change.goal)}`;
          const unlockLabel = `${trainerTierLabels[change.tier]} unlocked`;
          return (
            <li
              key={`${change.kind}-${change.kind === 'badge' ? change.id : change.specialty}`}
            >
              <div
                role="group"
                className={styles.reward}
                data-tier={tier}
                data-tier-unlock={celebrating}
                data-unlocked={unlocked}
                style={
                  { '--reward-delay': `${starts[index]}ms` } as CSSProperties
                }
                aria-label={`${change.label}: +${change.delta}, ${total}${change.earned ? `, ${unlockLabel}` : ''}`}
              >
                <span className={styles.rewardArt} aria-hidden="true">
                  {change.kind === 'badge' ? (
                    <TrainerBadgeMark tier={tier} id={change.id} />
                  ) : (
                    <TrainerTitleMark
                      tier={tier}
                      specialty={change.specialty}
                    />
                  )}
                </span>
                <span className={styles.rewardBody} aria-hidden="true">
                  <strong className={styles.rewardName}>{change.label}</strong>
                  <span className={styles.rewardProgress}>
                    <span className={styles.rewardTrack}>
                      <span
                        style={{
                          transform: `scaleX(${Math.max(0, Math.min(current / change.goal, 1))})`,
                        }}
                      />
                    </span>
                    <small className={unlocked ? styles.isUnlocked : undefined}>
                      {unlocked
                        ? unlockLabel
                        : change.tier === 3
                          ? `${format(current)} total`
                          : `${format(current)} / ${format(change.goal)}`}
                    </small>
                  </span>
                </span>
                <b className={styles.rewardGain} aria-hidden="true">
                  +{format(credited)}
                </b>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

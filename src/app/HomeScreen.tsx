import * as styles from './classes.css.ts';
import { site } from '@/app/site';
import { GameButton } from '@/components/GameButton';
import { LevelLabel } from '@/components/LevelLabel';
import {
  ArrowRightIcon,
  LockSimpleIcon,
  SlidersHorizontalIcon,
} from '@/components/icons';
import type { Level } from '@/domain/quiz/level';
import type { TrainerBadge } from '@/domain/player/trainer-progression';
import { formatDailyDate } from '@/domain/quiz/format';
import type { GameResult } from '@/domain/quiz/types';
import { LeagueTrophy } from '@/features/league/LeagueTrophy';
import { CatchCombo } from '@/features/daily/CatchCombo';
import { ShareResultButton } from '@/features/sharing/ShareResultButton';
import { TrainerBadgeCase } from '@/features/trainer/TrainerBadgeCase';
import { Logo } from './Logo';
import { Link } from '@tanstack/react-router';
import { useInteractionSound } from '@/lib/audio/sound-context';

interface HomeScreenProps {
  catalogStatus: 'loading' | 'ready' | 'error';
  dailyDate: string;
  dailyError?: string;
  dailyResult: GameResult | null;
  dailyResultSaved: boolean;
  dailyForfeited: boolean;
  dailyStreak: number;
  level: Level;
  badges: readonly TrainerBadge[];
  leagueCompleted?: boolean;
  onCustomizeTraining: () => void;
  onRetryCatalog: () => void;
  onStart: () => void;
  onStartDaily: () => void;
  onStartLeague: () => void;
  storageAvailable: boolean;
}

export const HomeScreen = ({
  catalogStatus,
  dailyDate,
  dailyError,
  dailyResult,
  dailyResultSaved,
  dailyForfeited,
  dailyStreak,
  level,
  badges,
  leagueCompleted = false,
  onCustomizeTraining,
  onRetryCatalog,
  onStart,
  onStartDaily,
  onStartLeague,
  storageAvailable,
}: HomeScreenProps) => {
  const playSound = useInteractionSound();
  const catalogReady = catalogStatus === 'ready';
  const dailyDetail = `${formatDailyDate(dailyDate)}${storageAvailable ? '' : ' · Browser storage required'}`;
  const badgeCount = badges.length;
  const earnedBadgeCount = badges.filter(({ earned }) => earned).length;
  const leagueUnlocked = badgeCount > 0 && earnedBadgeCount === badgeCount;
  const leagueContent = (
    <>
      {leagueUnlocked ? (
        <LeagueTrophy locked={!leagueCompleted} />
      ) : (
        <TrainerBadgeCase badges={badges} compact />
      )}
      <span className={styles.landingLeagueCopy}>
        <strong>Quizmon League</strong>
        <span>
          {leagueUnlocked
            ? leagueCompleted
              ? 'Challenge · Hall of Fame'
              : 'Challenge'
            : badgeCount
              ? `${earnedBadgeCount} / ${badgeCount} badges`
              : 'Preparing badges…'}
        </span>
      </span>
      {leagueUnlocked ? (
        <ArrowRightIcon aria-hidden="true" weight="bold" />
      ) : (
        <LockSimpleIcon aria-hidden="true" weight="bold" />
      )}
    </>
  );

  return (
    <section className={styles.landing} aria-labelledby="landing-title">
      <h1 id="landing-title" className="visually-hidden">
        {site.title}
      </h1>
      <Logo />
      <div className={styles.landingPrimary}>
        {catalogStatus === 'error' ? (
          <div
            className={`${styles.landingStatus} ${styles.landingStatusError}`}
            role="alert"
          >
            <span>The Daily Challenge could not be loaded.</span>
            <GameButton tone="quiet" onClick={onRetryCatalog}>
              Try again
            </GameButton>
          </div>
        ) : null}
        {dailyError ? (
          <p
            className={`${styles.landingStatus} ${styles.landingStatusError}`}
            role="alert"
          >
            {dailyError}
          </p>
        ) : null}
        {dailyResult ? (
          <ShareResultButton
            aria-label="Share result"
            className={`${styles.dailyAction} ${styles.dailyActionComplete}`}
            mode={{
              kind: 'daily',
              date: dailyDate,
            }}
            result={dailyResult}
          >
            <span className={styles.dailyActionCopy}>
              <strong className={styles.dailyActionTitle}>
                Daily Challenge
              </strong>
              <span className={styles.dailyActionDetail}>
                {dailyResult.score.toLocaleString()} points
                {dailyResultSaved ? '' : ' · Not saved'}
              </span>
            </span>
            <CatchCombo count={dailyStreak} placement="dailyAction" />
          </ShareResultButton>
        ) : (
          <GameButton
            aria-label={
              dailyForfeited
                ? `Daily Challenge for ${formatDailyDate(dailyDate)} forfeited`
                : `Play Daily Challenge for ${formatDailyDate(dailyDate)}${dailyStreak > 0 ? `. ${dailyStreak}-day Daily Combo.` : ''}`
            }
            className={styles.dailyAction}
            disabled={dailyForfeited || !catalogReady || !storageAvailable}
            onClick={onStartDaily}
          >
            <span className={styles.dailyActionCopy}>
              <strong className={styles.dailyActionTitle}>
                Daily Challenge
              </strong>
              {dailyForfeited ? (
                <span className={styles.dailyActionDetail}>
                  Attempt forfeited
                </span>
              ) : catalogStatus === 'loading' ? (
                <span className={styles.dailyActionDetail} role="status">
                  <span className={styles.landingSpinner} aria-hidden="true" />
                  Preparing Daily Challenge…
                </span>
              ) : (
                <span className={styles.dailyActionDetail}>{dailyDetail}</span>
              )}
            </span>
            <CatchCombo count={dailyStreak} placement="dailyAction" />
          </GameButton>
        )}
      </div>
      <div className={styles.landingControlStack}>
        <div className={styles.landingActions} aria-label="Training">
          <GameButton
            aria-label="Customize training"
            title="Customize training"
            className={styles.landingCustomize}
            disabled={!catalogReady}
            tone="quiet"
            onClick={onCustomizeTraining}
          >
            <SlidersHorizontalIcon aria-hidden="true" weight="bold" />
          </GameButton>
          <GameButton
            aria-label={`Start Level ${level} training`}
            disabled={!catalogReady}
            onClick={onStart}
          >
            <span>
              <LevelLabel level={level} /> Training
            </span>
          </GameButton>
        </div>
        {leagueUnlocked ? (
          <GameButton
            className={styles.landingLeagueButton}
            aria-label="Quizmon League"
            disabled={!catalogReady}
            tone="quiet"
            onClick={onStartLeague}
          >
            {leagueContent}
          </GameButton>
        ) : (
          <Link
            to="/trainer/badges"
            aria-label={
              badgeCount
                ? `Quizmon League locked. Earn all ${badgeCount} League Badges. ${earnedBadgeCount} of ${badgeCount} earned. View Badge Case.`
                : 'Quizmon League locked. Preparing badges. View Badge Case.'
            }
            className={`game-button game-button--quiet ${styles.landingLeagueButton} ${styles.landingLeagueButtonLocked}`}
            onClick={() => playSound('tap')}
          >
            {leagueContent}
          </Link>
        )}
      </div>
    </section>
  );
};

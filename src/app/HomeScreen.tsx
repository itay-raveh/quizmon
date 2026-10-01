import { site } from '@/app/site';
import { GameButton } from '@/components/GameButton';
import { LevelLabel } from '@/components/LevelLabel';
import {
  ArrowRightIcon,
  LockSimpleIcon,
  SlidersHorizontalIcon,
} from '@/components/icons';
import type { Difficulty } from '@/domain/quiz/difficulty';
import type { TrainerBadge } from '@/domain/player/trainer-progression';
import { formatDailyDate } from '@/domain/quiz/format';
import type { GameResult } from '@/domain/quiz/types';
import { LeagueTrophy } from '@/features/league/LeagueTrophy';
import { CatchCombo } from '@/features/daily/CatchCombo';
import { ShareResultButton } from '@/features/sharing/ShareResultButton';
import { TrainerBadgeMark } from '@/features/trainer/TrainerBadgeMark';
import { Logo } from './Logo';
import { Link } from 'react-router';
import { useInteractionSound } from '@/lib/audio/sound-context';

interface HomeScreenProps {
  catalogStatus: 'loading' | 'ready' | 'error';
  dailyDate: string;
  dailyError?: string;
  dailyResult: GameResult | null;
  dailyResultSaved: boolean;
  dailyStreak: number;
  level: Difficulty;
  badges: readonly Pick<TrainerBadge, 'id' | 'tier' | 'earned'>[];
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
        <span className="landing__league-badges" aria-hidden="true">
          {badges.map(({ id, tier }) => (
            <TrainerBadgeMark key={id} id={id} tier={tier} />
          ))}
        </span>
      )}
      <span className="landing__league-copy">
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
    <section className="landing" aria-labelledby="landing-title">
      <h1 id="landing-title" className="visually-hidden">
        {site.title}
      </h1>
      <Logo />
      <div className="landing__primary">
        {catalogStatus === 'error' ? (
          <div className="landing__status landing__status--error" role="alert">
            <span>The Daily Challenge could not be loaded.</span>
            <GameButton tone="quiet" onClick={onRetryCatalog}>
              Try again
            </GameButton>
          </div>
        ) : null}
        {dailyError ? (
          <p className="landing__status landing__status--error" role="alert">
            {dailyError}
          </p>
        ) : null}
        {dailyResult ? (
          <ShareResultButton
            aria-label="Share result"
            className={`daily-action daily-action--complete ${dailyStreak > 0 ? 'daily-action--with-combo' : ''}`.trim()}
            mode={{
              kind: 'daily',
              date: dailyDate,
            }}
            result={dailyResult}
          >
            <span className="daily-action__copy">
              <strong className="daily-action__title">Daily Challenge</strong>
              <span className="daily-action__detail">
                {dailyResult.score.toLocaleString()} points
                {dailyResultSaved ? '' : ' · Not saved'}
              </span>
            </span>
            <CatchCombo count={dailyStreak} />
          </ShareResultButton>
        ) : (
          <GameButton
            aria-label={`Play Daily Challenge for ${formatDailyDate(dailyDate)}${dailyStreak > 0 ? `. ${dailyStreak}-day Daily Combo.` : ''}`}
            className={`daily-action ${dailyStreak > 0 ? 'daily-action--with-combo' : ''}`.trim()}
            disabled={!catalogReady || !storageAvailable}
            onClick={onStartDaily}
          >
            <span className="daily-action__copy">
              <strong className="daily-action__title">Daily Challenge</strong>
              {catalogStatus === 'loading' ? (
                <span className="daily-action__detail" role="status">
                  <span className="landing__spinner" aria-hidden="true" />
                  Preparing Daily Challenge…
                </span>
              ) : (
                <span className="daily-action__detail">{dailyDetail}</span>
              )}
            </span>
            <CatchCombo count={dailyStreak} />
          </GameButton>
        )}
      </div>
      <div className="landing__control-stack">
        <div className="landing__actions" aria-label="Training">
          <GameButton
            aria-label="Customize training"
            title="Customize training"
            className="landing__customize"
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
            className="landing__league-button"
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
            className="game-button game-button--quiet landing__league-button landing__league-button--locked"
            onClick={() => playSound('tap')}
          >
            {leagueContent}
          </Link>
        )}
      </div>
    </section>
  );
};

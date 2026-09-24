import { site } from '@/app/site';
import { GameButton } from '@/components/GameButton';
import { ArrowRightIcon, SlidersHorizontalIcon } from '@/components/icons';
import { formatDailyDate } from '@/domain/quiz/format';
import type { GameResult } from '@/domain/quiz/types';
import { LeagueTrophy } from '@/features/league/LeagueTrophy';
import { CatchCombo } from '@/features/daily/CatchCombo';
import { ShareResultButton } from '@/features/sharing/ShareResultButton';
import { Logo } from './Logo';

interface HomeScreenProps {
  catalogStatus: 'loading' | 'ready' | 'error';
  dailyDate: string;
  dailyError?: string;
  dailyResult: GameResult | null;
  dailyResultSaved: boolean;
  dailyStreak: number;
  leagueUnlocked: boolean;
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
  leagueUnlocked,
  leagueCompleted = false,
  onCustomizeTraining,
  onRetryCatalog,
  onStart,
  onStartDaily,
  onStartLeague,
  storageAvailable,
}: HomeScreenProps) => {
  const catalogReady = catalogStatus === 'ready';
  const dailyDetail = `${formatDailyDate(dailyDate)}${storageAvailable ? '' : ' · Browser storage required'}`;

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
              track: dailyResult.dailyTrack,
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
            aria-label="Start training"
            disabled={!catalogReady}
            onClick={onStart}
          >
            <span>Start training</span>
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
            <LeagueTrophy locked={!leagueCompleted} />
            <span className="landing__league-copy">
              <strong>Quizmon League</strong>
              <span>
                {leagueCompleted ? 'Challenge · Hall of Fame' : 'Challenge'}
              </span>
            </span>
            <ArrowRightIcon aria-hidden="true" weight="bold" />
          </GameButton>
        ) : null}
      </div>
    </section>
  );
};

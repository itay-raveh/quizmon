import { site } from '@/app/site';
import { GameButton } from '@/components/GameButton';
import { ArrowRightIcon } from '@/components/icons';
import { formatDailyDate } from '@/domain/pokemon/format';
import { getLocalDate } from '@/domain/quiz/daily';
import type { GameResult } from '@/domain/quiz/types';
import { LeagueTrophy } from '@/features/league/LeagueTrophy';
import { CatchCombo } from '@/features/quiz/CatchCombo';
import { SettingsButton } from '@/features/settings/SettingsButton';
import { ShareResultButton } from '@/features/sharing/ShareResultButton';
import { Logo } from './Logo';

interface HomeScreenProps {
  catalogStatus: 'loading' | 'ready' | 'error';
  dailyDate: string;
  dailyResult: GameResult | null;
  dailyResultSaved: boolean;
  dailyStreak: number;
  leagueUnlocked: boolean;
  leagueCompleted?: boolean;
  onOpenTrainerCard: () => void;
  onOpenSettings: () => void;
  onRetryCatalog: () => void;
  onStart: () => void;
  onStartDaily: () => void;
  onStartLeague: () => void;
  storageAvailable: boolean;
}

export const HomeScreen = ({
  catalogStatus,
  dailyDate,
  dailyResult,
  dailyResultSaved,
  dailyStreak,
  leagueUnlocked,
  leagueCompleted = false,
  onOpenTrainerCard,
  onOpenSettings,
  onRetryCatalog,
  onStart,
  onStartDaily,
  onStartLeague,
  storageAvailable,
}: HomeScreenProps) => {
  const catalogReady = catalogStatus === 'ready';
  const dailyDetail = [
    dailyDate === getLocalDate() ? null : formatDailyDate(dailyDate),
    storageAvailable ? null : 'Browser storage required',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="landing" aria-labelledby="landing-title">
      <h1 id="landing-title" className="visually-hidden">
        {site.title}
      </h1>
      <Logo />
      <div className="landing__primary">
        {catalogStatus === 'loading' ? (
          <p className="landing__status" role="status">
            Loading Daily Challenge…
          </p>
        ) : null}
        {catalogStatus === 'error' ? (
          <div className="landing__status landing__status--error" role="alert">
            <span>The Daily Challenge could not be loaded.</span>
            <GameButton tone="quiet" onClick={onRetryCatalog}>
              Try again
            </GameButton>
          </div>
        ) : null}
        {dailyResult ? (
          <ShareResultButton
            className={`daily-action daily-action--complete ${dailyStreak > 0 ? 'daily-action--with-combo' : ''}`.trim()}
            mode={{ kind: 'daily', date: dailyDate }}
            result={dailyResult}
          >
            <span className="daily-action__copy">
              <strong className="daily-action__title">Share result</strong>
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
              {dailyDetail ? (
                <span className="daily-action__detail">{dailyDetail}</span>
              ) : null}
            </span>
            <CatchCombo count={dailyStreak} />
          </GameButton>
        )}
      </div>
      <div className="landing__control-stack">
        <div className="landing__actions" aria-label="Play and profile">
          <SettingsButton disabled={!catalogReady} onClick={onOpenSettings} />
          <GameButton
            className="landing__trainer-button"
            disabled={!catalogReady}
            tone="quiet"
            onClick={onOpenTrainerCard}
          >
            <span>Trainer profile</span>
          </GameButton>
          <GameButton disabled={!catalogReady} onClick={onStart}>
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

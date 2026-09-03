import { formatDailyDate, getUtcDate } from '@/game/daily';
import type { GameResult } from '@/game/types';
import { CatchCombo } from './CatchCombo';
import { GameButton } from './GameButton';
import { Logo } from './Logo';
import { SettingsButton } from './SettingsButton';
import { ShareResultButton } from './ShareResultButton';

interface LandingProps {
  catalogStatus: 'loading' | 'ready' | 'error';
  dailyDate: string;
  dailyResult: GameResult | null;
  dailyResultSaved: boolean;
  dailyStreak: number;
  onOpenTrainerCard: () => void;
  onOpenSettings: () => void;
  onRetryCatalog: () => void;
  onStart: () => void;
  onStartDaily: () => void;
  partnerSprite: string | null;
  storageAvailable: boolean;
}

export const Landing = ({
  catalogStatus,
  dailyDate,
  dailyResult,
  dailyResultSaved,
  dailyStreak,
  onOpenTrainerCard,
  onOpenSettings,
  onRetryCatalog,
  onStart,
  onStartDaily,
  partnerSprite,
  storageAvailable,
}: LandingProps) => {
  const dailyDetail = [
    dailyDate === getUtcDate() ? null : formatDailyDate(dailyDate),
    storageAvailable ? null : 'Browser storage required',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="landing" aria-labelledby="landing-title">
      <h1 id="landing-title" className="visually-hidden">
        Quizmon
      </h1>
      <Logo />
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
            <strong className="daily-action__title">Daily complete</strong>
            <span className="daily-action__detail">
              {dailyResult.score.toLocaleString()} points
              {dailyResultSaved ? ' · Share' : ' · Not saved · Share'}
            </span>
          </span>
          <CatchCombo count={dailyStreak} />
        </ShareResultButton>
      ) : (
        <GameButton
          aria-label={`Play Daily Challenge for ${formatDailyDate(dailyDate)}${dailyStreak > 0 ? `. ${dailyStreak}-day Daily Combo.` : ''}`}
          className={`daily-action ${dailyStreak > 0 ? 'daily-action--with-combo' : ''}`.trim()}
          disabled={catalogStatus !== 'ready' || !storageAvailable}
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
      <div className="landing__actions" aria-label="Play and profile">
        <SettingsButton
          disabled={catalogStatus !== 'ready'}
          onClick={onOpenSettings}
        />
        <GameButton
          className="landing__trainer-button"
          disabled={catalogStatus !== 'ready'}
          tone="quiet"
          onClick={onOpenTrainerCard}
        >
          {partnerSprite ? (
            <img
              aria-hidden="true"
              src={partnerSprite}
              width="96"
              height="96"
            />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8" cy="11" r="2" />
              <path d="M5.5 16c.7-1.6 1.6-2.4 2.5-2.4s1.8.8 2.5 2.4M13 10h5M13 14h5" />
            </svg>
          )}
          <span>Trainer Card</span>
        </GameButton>
        <GameButton disabled={catalogStatus !== 'ready'} onClick={onStart}>
          <span>Start training</span>
        </GameButton>
      </div>
    </section>
  );
};

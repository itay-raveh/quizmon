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
            <strong className="daily-action__title daily-action__share-title">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
              </svg>
              Share result
            </strong>
            <span className="daily-action__detail">
              Daily complete · {dailyResult.score.toLocaleString()} points
              {dailyResultSaved ? '' : ' · Not saved'}
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
          <span>Trainer Card</span>
        </GameButton>
        <GameButton disabled={catalogStatus !== 'ready'} onClick={onStart}>
          <span>Start training</span>
        </GameButton>
      </div>
    </section>
  );
};

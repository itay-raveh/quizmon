import { formatDailyDate } from '@/game/daily';
import type { GameResult } from '@/game/types';
import { CatchCombo } from './CatchCombo';
import { GameButton } from './GameButton';
import { Logo } from './Logo';
import { ShareResultButton } from './ShareResultButton';

interface LandingProps {
  catalogStatus: 'loading' | 'ready' | 'error';
  dailyDate: string;
  dailyResult: GameResult | null;
  dailyResultSaved: boolean;
  dailyStreak: number;
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
  onOpenSettings,
  onRetryCatalog,
  onStart,
  onStartDaily,
  storageAvailable,
}: LandingProps) => {
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
            <span className="daily-action__detail">
              {formatDailyDate(dailyDate)} ·{' '}
              {storageAvailable ? '5 questions' : 'Browser storage required'}
            </span>
          </span>
          <CatchCombo count={dailyStreak} />
        </GameButton>
      )}
      <div className="landing__actions" aria-label="Training">
        <GameButton
          disabled={catalogStatus !== 'ready'}
          tone="quiet"
          onClick={onOpenSettings}
        >
          <span>Settings</span>
        </GameButton>
        <GameButton disabled={catalogStatus !== 'ready'} onClick={onStart}>
          <span>Start training</span>
        </GameButton>
      </div>
    </section>
  );
};

import { formatDailyDate } from '@/game/daily';
import type { GameResult } from '@/game/types';
import { GameButton } from './GameButton';
import { Logo } from './Logo';
import { ShareResultButton } from './ShareResultButton';

interface LandingProps {
  catalogStatus: 'loading' | 'ready' | 'error';
  dailyDate: string;
  dailyResult: GameResult | null;
  dailyResultSaved: boolean;
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
          Loading Trainer Trial…
        </p>
      ) : null}
      {catalogStatus === 'error' ? (
        <div className="landing__status landing__status--error" role="alert">
          <span>The Trainer Trial could not be loaded.</span>
          <GameButton tone="quiet" onClick={onRetryCatalog}>
            Try again
          </GameButton>
        </div>
      ) : null}
      <div className="daily-card">
        <div>
          <strong>{dailyResult ? 'Daily complete' : 'Trainer Trial'}</strong>
          <span>
            {formatDailyDate(dailyDate)} ·{' '}
            {dailyResult
              ? `${dailyResult.score.toLocaleString()} / 1,000${dailyResultSaved ? '' : ' · not saved'}`
              : storageAvailable
                ? '10 questions'
                : 'browser storage required'}
          </span>
        </div>
        {dailyResult ? (
          <ShareResultButton
            mode={{ kind: 'daily', date: dailyDate }}
            result={dailyResult}
          >
            <span>Share</span>
          </ShareResultButton>
        ) : (
          <GameButton
            disabled={catalogStatus !== 'ready' || !storageAvailable}
            onClick={onStartDaily}
          >
            <span>Play daily</span>
          </GameButton>
        )}
      </div>
      <div className="landing__actions" aria-label="Training">
        <GameButton
          disabled={catalogStatus !== 'ready'}
          tone="quiet"
          onClick={onOpenSettings}
        >
          <span>Setup</span>
        </GameButton>
        <GameButton disabled={catalogStatus !== 'ready'} onClick={onStart}>
          <span>Start training</span>
        </GameButton>
      </div>
    </section>
  );
};

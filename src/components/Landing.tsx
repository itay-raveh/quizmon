import { useState } from 'react';
import { formatDailyDate } from '@/game/daily';
import { shareResult } from '@/game/share';
import type { GameResult } from '@/game/types';
import { GameButton } from './GameButton';
import { Logo } from './Logo';

interface LandingProps {
  catalogStatus: 'loading' | 'ready' | 'error';
  dailyDate: string;
  dailyResult: GameResult | null;
  onOpenSettings: () => void;
  onRetryCatalog: () => void;
  onStart: () => void;
  onStartDaily: () => void;
}

export const Landing = ({
  catalogStatus,
  dailyDate,
  dailyResult,
  onOpenSettings,
  onRetryCatalog,
  onStart,
  onStartDaily,
}: LandingProps) => {
  const [shareStatus, setShareStatus] = useState('');

  const shareDaily = async () => {
    if (!dailyResult) return;
    try {
      const status = await shareResult(
        { kind: 'daily', date: dailyDate },
        dailyResult,
      );
      setShareStatus(
        status === 'copied'
          ? 'Result copied to the clipboard.'
          : status === 'shared'
            ? 'Result shared.'
            : '',
      );
    } catch {
      setShareStatus('Could not share this result.');
    }
  };

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
              ? `${dailyResult.score.toLocaleString()} / 1,000`
              : '10 questions'}
          </span>
        </div>
        {dailyResult ? (
          <GameButton onClick={() => void shareDaily()}>
            <span>Share</span>
          </GameButton>
        ) : (
          <GameButton
            disabled={catalogStatus !== 'ready'}
            onClick={onStartDaily}
          >
            <span>Play daily</span>
          </GameButton>
        )}
        <span className="visually-hidden" aria-live="polite">
          {shareStatus}
        </span>
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

import { GameButton } from './GameButton';
import { Logo } from './Logo';
import { formatDailyDate } from '@/game/daily';

interface LandingProps {
  catalogStatus: 'loading' | 'ready' | 'error';
  dailyDate: string;
  onOpenSettings: () => void;
  onRetryCatalog: () => void;
  onStart: () => void;
  onStartDaily: () => void;
}

export const Landing = ({
  catalogStatus,
  dailyDate,
  onOpenSettings,
  onRetryCatalog,
  onStart,
  onStartDaily,
}: LandingProps) => (
  <section className="landing" aria-labelledby="landing-title">
    <h1 id="landing-title" className="visually-hidden">
      Quizmon
    </h1>
    <Logo />
    {catalogStatus === 'loading' ? (
      <p className="landing__status" role="status">
        Loading Pokédex…
      </p>
    ) : null}
    {catalogStatus === 'error' ? (
      <div className="landing__status landing__status--error" role="alert">
        <span>The Pokédex could not be loaded.</span>
        <GameButton tone="quiet" onClick={onRetryCatalog}>
          Try again
        </GameButton>
      </div>
    ) : null}
    <div className="daily-card">
      <div>
        <strong>Daily challenge</strong>
        <span>{formatDailyDate(dailyDate)} · 10 questions</span>
      </div>
      <GameButton disabled={catalogStatus !== 'ready'} onClick={onStartDaily}>
        <span>Play daily</span>
      </GameButton>
    </div>
    <div className="landing__actions" aria-label="Custom game">
      <GameButton
        disabled={catalogStatus !== 'ready'}
        tone="quiet"
        onClick={onOpenSettings}
      >
        <span>Modifiers</span>
      </GameButton>
      <GameButton disabled={catalogStatus !== 'ready'} onClick={onStart}>
        <span>Custom game</span>
      </GameButton>
    </div>
  </section>
);

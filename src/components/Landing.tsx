import { GameButton } from './GameButton';
import { Logo } from './Logo';

interface LandingProps {
  catalogStatus: 'loading' | 'ready' | 'error';
  onOpenSettings: () => void;
  onRetryCatalog: () => void;
  onStart: () => void;
}

export const Landing = ({
  catalogStatus,
  onOpenSettings,
  onRetryCatalog,
  onStart,
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
    <div className="landing__actions">
      <GameButton
        disabled={catalogStatus !== 'ready'}
        tone="quiet"
        onClick={onOpenSettings}
      >
        Modifiers
      </GameButton>
      <GameButton disabled={catalogStatus !== 'ready'} onClick={onStart}>
        Start
      </GameButton>
    </div>
  </section>
);

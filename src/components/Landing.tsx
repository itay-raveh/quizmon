import { GameButton } from './GameButton';
import { Logo } from './Logo';

interface LandingProps {
  onOpenSettings: () => void;
  onStart: () => void;
}

export const Landing = ({ onOpenSettings, onStart }: LandingProps) => (
  <section className="landing" aria-labelledby="landing-title">
    <h1 id="landing-title" className="visually-hidden">
      Quizmon
    </h1>
    <Logo />
    <div className="landing__actions">
      <GameButton tone="quiet" onClick={onOpenSettings}>
        Modifiers
      </GameButton>
      <GameButton onClick={onStart}>Start</GameButton>
    </div>
  </section>
);

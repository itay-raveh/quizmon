import { useEffect, useRef } from 'react';
import chamber from '@/assets/images/league-chamber.png';
import { site } from '@/app/site';
import { LEAGUE_QUESTION_COUNT, leagueStages } from '@/game/league';
import type { TrainerProfile } from '@/game/trainer-profile';
import type { PokemonCatalog } from '@/game/types';
import { ChampionTrophy } from './ChampionTrophy';
import { GameButton } from './GameButton';
import { ArrowLeftIcon, CheckIcon } from './icons';
import { PokemonIdentity } from './PokemonIdentity';
import { useReducedMotion } from './motion';
import '@/styles/league.css';

interface LeagueDestinationProps {
  catalog: PokemonCatalog;
  completed: boolean;
  celebrate?: boolean;
  onBack: () => void;
  onStart: () => void;
  onViewResults?: () => void;
  profile: TrainerProfile;
  resultSaved?: boolean;
}

export const LeagueDestination = ({
  catalog,
  completed,
  celebrate = false,
  onBack,
  onStart,
  onViewResults,
  profile,
  resultSaved = true,
}: LeagueDestinationProps) => {
  const heading = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();
  const partner = profile.partnerPokemon
    ? catalog.pokemon[profile.partnerPokemon]
    : null;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  return (
    <section
      className={`league-hall${completed ? ' league-hall--complete' : ''}${celebrate && !reducedMotion ? ' league-hall--induction' : ''}`}
      aria-labelledby="league-hall-title"
    >
      <header className="league-hall__header">
        <GameButton aria-label="Back to home" onClick={onBack} tone="quiet">
          <ArrowLeftIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <h1 id="league-hall-title" ref={heading} tabIndex={-1}>
          {completed ? 'Hall of Fame' : 'Quizmon League'}
        </h1>
      </header>

      <div className="league-hall__chamber">
        <ChampionTrophy className="league-hall__trophy" />
        {completed ? (
          <>
            <div className="league-hall__identity">
              <h2>{profile.name || `${site.name} Trainer`}</h2>
              <p>League Champion</p>
            </div>
            <div className="league-hall__partner">
              <div className="league-hall__portrait">
                <img
                  className="league-hall__backdrop"
                  src={chamber}
                  alt=""
                  width="384"
                  height="256"
                />
                {partner?.sprite ? (
                  <img
                    className="league-hall__sprite"
                    src={partner.sprite}
                    alt=""
                    width="96"
                    height="96"
                  />
                ) : null}
              </div>
              {partner && profile.partnerPokemon ? (
                <PokemonIdentity
                  dexNumber={partner.id}
                  name={profile.partnerPokemon}
                />
              ) : null}
            </div>
            <p className="league-hall__record">
              Perfect clear{' '}
              <strong>
                {LEAGUE_QUESTION_COUNT} / {LEAGUE_QUESTION_COUNT}
              </strong>
            </p>
          </>
        ) : (
          <div className="league-hall__invitation">
            <h2>
              Earn your place
              <br />
              in the Hall of Fame.
            </h2>
            <p>
              Five trials. Fifteen questions.
              <br />
              One wrong answer ends the challenge.
            </p>
          </div>
        )}
      </div>

      <ol
        className="league-hall__trials"
        aria-label={
          completed ? 'Five completed League trials' : 'Five League trials'
        }
      >
        {leagueStages.map((stage) => (
          <li key={stage.id}>
            <span className="league-hall__trial-mark" aria-hidden="true">
              {stage.marker === 'C' ? <ChampionTrophy /> : stage.marker}
            </span>
            <span className="league-hall__trial-name">
              {stage.heading.replace('Elite ', '')}
            </span>
            <span className="league-hall__trial-detail">{stage.title}</span>
            {completed ? (
              <span className="league-hall__trial-score">
                <CheckIcon aria-hidden="true" weight="bold" />3 / 3
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {!resultSaved ? (
        <p className="league-hall__notice" role="alert">
          Your victory could not be saved on this device.
        </p>
      ) : null}
      <footer className="league-hall__actions">
        <GameButton onClick={onStart}>
          {completed ? 'League rematch' : 'Start League challenge'}
        </GameButton>
        {onViewResults ? (
          <GameButton tone="quiet" onClick={onViewResults}>
            View results
          </GameButton>
        ) : null}
      </footer>
    </section>
  );
};

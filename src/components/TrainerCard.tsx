import type { Ref } from 'react';
import { site, siteHostname } from '@/app/site';
import { formatDailyDate } from '@/game/daily';
import type { TrainerStats } from '@/game/storage';
import type { TrainerProfile } from '@/game/trainer-profile';
import {
  getCardFinish,
  getTrainerRank,
  trainerSpecialtyLabels,
} from '@/game/trainer';
import { TrainerCardFinishEffects } from './TrainerCardFinishEffects';
import { PokemonIdentity } from './PokemonIdentity';

interface TrainerCardProps {
  cardRef?: Ref<HTMLElement>;
  partnerDexNumber: number | null;
  partnerSprite: string | null;
  profile: TrainerProfile;
  stats: TrainerStats;
}

export const TrainerCard = ({
  cardRef,
  partnerDexNumber,
  partnerSprite,
  profile,
  stats,
}: TrainerCardProps) => {
  const rank = getTrainerRank(stats);
  const finish = getCardFinish(rank);
  const partnerName = profile.partnerPokemon ?? 'Choose partner';

  return (
    <article
      ref={cardRef}
      className={`trainer-card trainer-card--${finish.toLowerCase()}`}
      aria-label="Trainer Card"
    >
      <TrainerCardFinishEffects
        finish={finish}
        sparkles={rank === 'Champion'}
      />
      <header className="trainer-card__banner">
        <span>{site.name} League</span>
        <strong>{rank}</strong>
      </header>
      <div className="trainer-card__front">
        <div className="trainer-card__partner">
          <div className="trainer-card__portrait" aria-hidden="true">
            {partnerSprite ? (
              <img src={partnerSprite} alt="" width="96" height="96" />
            ) : (
              <span className="trainer-card__partner-mark">?</span>
            )}
          </div>
          <PokemonIdentity
            className="trainer-card__partner-caption question-visual__subject-name"
            dexNumber={partnerDexNumber ?? undefined}
            name={partnerName}
            numberClassName="question-visual__subject-number"
          />
        </div>
        <div className="trainer-card__identity">
          <h2>{profile.name || `${site.name} Trainer`}</h2>
          {profile.specialty ? (
            <p className="trainer-card__title">
              {trainerSpecialtyLabels[profile.specialty]}
            </p>
          ) : null}
          <dl>
            <div>
              <dt>Trainer since</dt>
              <dd>{formatDailyDate(profile.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <footer className="trainer-card__footer">
        <span>Play at</span>
        <strong>{siteHostname}</strong>
      </footer>
    </article>
  );
};

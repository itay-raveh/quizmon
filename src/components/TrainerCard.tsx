import type { Ref } from 'react';
import { site } from '@/app/site';
import type { TrainerProfile } from '@/game/trainer-profile';
import {
  getCardFinish,
  trainerSpecialtyDetails,
  trainerViewLabels,
  type TrainerRank,
  type TrainerTier,
  trainerTierLabels,
} from '@/game/trainer';
import { TrainerCardFinishEffects } from './TrainerCardFinishEffects';
import { TrainerArtifactFrame } from './TrainerArtifactFrame';
import { TrainerTitleMark } from './TrainerTitleMark';
import { PokemonIdentity } from './PokemonIdentity';
import { CatchCombo } from './CatchCombo';
import { Trophy } from './Trophy';

interface TrainerCardProps {
  cardRef?: Ref<HTMLElement>;
  partnerDexNumber: number | null;
  partnerSprite: string | null;
  profile: TrainerProfile;
  rank: TrainerRank;
  titleTier?: TrainerTier;
  record: {
    dayCombo: number;
    pokedexFound: number;
    pokedexTotal: number;
  };
}

export const TrainerCard = ({
  cardRef,
  partnerDexNumber,
  partnerSprite,
  profile,
  rank,
  titleTier = 1,
  record,
}: TrainerCardProps) => {
  const finish = getCardFinish(rank);
  const isChampion = rank === 'Champion';
  const partnerName = profile.partnerPokemon ?? 'Choose partner';

  return (
    <TrainerArtifactFrame
      ref={cardRef}
      className={`trainer-card trainer-card--${finish.toLowerCase()}${isChampion ? ' trainer-card--champion' : ''}`}
      aria-label={trainerViewLabels.front}
    >
      <TrainerCardFinishEffects finish={finish} polished={isChampion} />
      <div className="trainer-card__decoration" aria-hidden="true">
        <div className="trainer-card__watermark" />
      </div>
      <div className="trainer-card__front">
        <header className="trainer-card__rank">
          {rank}
          {isChampion ? <Trophy /> : null}
        </header>
        <div className="trainer-card__identity">
          <h2>{profile.name || `${site.name} Trainer`}</h2>
          {profile.specialty ? (
            <p
              className="trainer-card__title"
              aria-label={`${trainerSpecialtyDetails[profile.specialty].label}, ${trainerTierLabels[titleTier]} title`}
            >
              <span>{trainerSpecialtyDetails[profile.specialty].label}</span>
              <TrainerTitleMark
                plain
                tier={titleTier}
                specialty={profile.specialty}
              />
            </p>
          ) : null}
        </div>
        <div className="trainer-card__partner">
          <div className="trainer-card__portrait" aria-hidden="true">
            {partnerSprite ? (
              <img src={partnerSprite} alt="" width="96" height="96" />
            ) : (
              <span className="trainer-card__partner-mark">?</span>
            )}
          </div>
          <PokemonIdentity
            className="trainer-card__partner-caption"
            dexNumber={partnerDexNumber ?? undefined}
            name={partnerName}
          />
        </div>
      </div>
      <div className="trainer-card__details">
        <dl className="trainer-card__record">
          <div>
            <dt>Pokémon found</dt>
            <dd>
              {record.pokedexFound}
              <small> / {record.pokedexTotal}</small>
            </dd>
          </div>
        </dl>
        <CatchCombo className="trainer-card__combo" count={record.dayCombo} />
      </div>
    </TrainerArtifactFrame>
  );
};

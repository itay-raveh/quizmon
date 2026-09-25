import { site } from '@/app/site';
import { trainerAvatarOptions } from '@/domain/player/trainer-avatars';
import type { PackedSpriteMeasurements } from '@/domain/pokemon/types';
import { PokemonIdentity } from '@/components/PokemonIdentity';
import { Trophy } from '@/components/Trophy';
import {
  getCardFinish,
  trainerSpecialtyDetails,
  trainerTierLabels,
  trainerViewLabels,
  type TrainerRank,
  type TrainerTier,
} from '@/domain/player/trainer-progression';
import { CatchCombo } from '@/features/daily/CatchCombo';
import type { TrainerProfile } from '@/lib/storage/trainer-profile-storage';
import type { Ref } from 'react';
import { TrainerCardFinishEffects } from './TrainerCardFinishEffects';
import { TrainerTitleMark } from './TrainerTitleMark';

interface TrainerCardProps {
  cardRef?: Ref<HTMLElement>;
  emptyPartnerLabel?: string;
  partnerDexNumber: number | null;
  partnerHeight?: number;
  partnerSprite: string | null;
  partnerSpriteMeasurements?: PackedSpriteMeasurements | null;
  profile: TrainerProfile;
  rank: TrainerRank;
  titleTier?: TrainerTier;
  record: {
    dayCombo: number;
    pokedexFound: number;
    pokedexTotal: number;
  };
}

const rotomDisplayHeights: Record<string, number> = {
  'rotom-fan': 6,
  'rotom-frost': 18,
  'rotom-heat': 6,
  'rotom-mow': 9,
  'rotom-wash': 9,
};

export const TrainerCard = ({
  cardRef,
  emptyPartnerLabel = 'Choose partner',
  partnerDexNumber,
  partnerHeight,
  partnerSprite,
  partnerSpriteMeasurements,
  profile,
  rank,
  titleTier = 1,
  record,
}: TrainerCardProps) => {
  const finish = getCardFinish(rank);
  const isChampion = rank === 'Champion';
  const partnerName = profile.partnerPokemon ?? emptyPartnerLabel;
  const avatar = trainerAvatarOptions.find(({ id }) => id === profile.avatar);
  const groundOffset = avatar ? (1 - avatar.bottom) * 100 : 0;
  const height =
    rotomDisplayHeights[profile.partnerPokemon ?? ''] ?? partnerHeight ?? 8;
  const behindTrainer = height >= 16;
  const visibleHeight = Math.min(29, Math.max(5, (height * 29) / 16));
  const spriteSize = Math.min(
    48,
    visibleHeight / Math.max(partnerSpriteMeasurements?.[2] ?? 1, 0.25),
  );

  return (
    <article
      ref={cardRef}
      className={`trainer-artifact-frame trainer-card trainer-card--${finish.toLowerCase()}${isChampion ? ' trainer-card--champion' : ''}`}
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
        <div className="trainer-card__avatar">
          <div className="trainer-card__portrait">
            {avatar ? (
              <img
                className="trainer-card__portrait-image"
                src={`/trainer-avatars/${avatar.id}.png`}
                alt={`${avatar.name} trainer avatar`}
                width="80"
                height="80"
              />
            ) : (
              <span
                className="trainer-card__avatar-mark"
                aria-label="No trainer avatar selected"
              >
                ?
              </span>
            )}
            {partnerSprite && (
              <img
                className={`trainer-card__partner-sprite${behindTrainer ? ' trainer-card__partner-sprite--behind' : ''}`}
                src={partnerSprite}
                alt=""
                width="96"
                height="96"
                style={{
                  width: `${spriteSize}cqw`,
                  height: `${spriteSize}cqw`,
                  left: `${(behindTrainer ? 4 : 8) - spriteSize * (partnerSpriteMeasurements?.[3] ?? 0.5)}cqw`,
                  bottom: `calc(${groundOffset}% - ${spriteSize * (1 - (partnerSpriteMeasurements?.[4] ?? 1))}cqw)`,
                }}
              />
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
    </article>
  );
};

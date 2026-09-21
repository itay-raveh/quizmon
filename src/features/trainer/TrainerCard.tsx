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
import { CatchCombo } from '@/features/quiz/CatchCombo';
import type { TrainerProfile } from '@/lib/storage/trainer-profile-storage';
import { useState, type Ref } from 'react';
import { TrainerCardFinishEffects } from './TrainerCardFinishEffects';
import { TrainerTitleMark } from './TrainerTitleMark';

interface TrainerCardProps {
  cardRef?: Ref<HTMLElement>;
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

const getAvatarBottom = (image: HTMLImageElement): number => {
  const { naturalWidth: width, naturalHeight: height } = image;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return 1;

  try {
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, width, height).data;
    for (let row = height - 1; row >= 0; row--) {
      for (let column = 0; column < width; column++) {
        if (pixels[(row * width + column) * 4 + 3]) return (row + 1) / height;
      }
    }
  } catch {
    return 1;
  }
  return 1;
};

export const TrainerCard = ({
  cardRef,
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
  const partnerName = profile.partnerPokemon ?? 'Choose partner';
  const avatar = trainerAvatarOptions.find(({ id }) => id === profile.avatar);
  const [avatarBottom, setAvatarBottom] = useState<{
    id: string;
    fraction: number;
  } | null>(null);
  const groundOffset =
    avatar && avatarBottom?.id === avatar.id
      ? (1 - avatarBottom.fraction) * 100
      : 0;
  const partnerPositionReady = !avatar || avatarBottom?.id === avatar.id;
  const height = partnerHeight ?? 8;
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
                onLoad={(event) =>
                  setAvatarBottom({
                    id: avatar.id,
                    fraction: getAvatarBottom(event.currentTarget),
                  })
                }
                onError={() => setAvatarBottom({ id: avatar.id, fraction: 1 })}
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
                className={`trainer-card__partner-sprite${height > 16 ? ' trainer-card__partner-sprite--behind' : ''}${partnerPositionReady ? '' : ' trainer-card__partner-sprite--pending'}`}
                src={partnerSprite}
                alt=""
                width="96"
                height="96"
                style={{
                  width: `${spriteSize}cqw`,
                  height: `${spriteSize}cqw`,
                  left: `${(height > 16 ? 4 : 8) - spriteSize * (partnerSpriteMeasurements?.[3] ?? 0.5)}cqw`,
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

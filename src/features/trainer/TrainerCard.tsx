import { site } from '@/app/site';
import { trainerAvatarOptions } from '@/domain/player/trainer-avatars';
import type { PackedSpriteMeasurements } from '@/domain/pokemon/types';
import { PokemonIdentity } from '@/components/PokemonIdentity';
import { PlayerName } from '@/components/PlayerName';
import {
  getCardFinish,
  getTrainerRank,
  trainerViewLabels,
  type TrainerTier,
} from '@/domain/player/trainer-progression';
import type { TrainerStats } from '@/domain/player/progress';
import { CatchCombo } from '@/features/daily/CatchCombo';
import type { TrainerProfile } from '@/lib/storage/trainer-profile-storage';
import { TrainerCardFinishEffects } from './TrainerCardFinishEffects';
import { TrainerTitle } from './TrainerTitle';

interface TrainerCardProps {
  emptyPartnerLabel?: string;
  partnerDexNumber: number | null;
  partnerHeight?: number;
  partnerSprite: string | null;
  partnerSpriteMeasurements?: PackedSpriteMeasurements | null;
  trainer: { profile: TrainerProfile; stats: TrainerStats };
  titleTier?: TrainerTier;
  record: {
    dayCombo: number;
    pokedexFound: number;
    pokedexTotal: number;
  };
}

export const TrainerCard = ({
  emptyPartnerLabel = 'Choose partner',
  partnerDexNumber,
  partnerHeight,
  partnerSprite,
  partnerSpriteMeasurements,
  trainer,
  titleTier = 1,
  record,
}: TrainerCardProps) => {
  const { profile, stats } = trainer;
  const rank = getTrainerRank(stats);
  const finish = getCardFinish(rank);
  const isChampion = rank === 'Champion';
  const partnerName = profile.partnerPokemon ?? emptyPartnerLabel;
  const avatar = trainerAvatarOptions.find(({ id }) => id === profile.avatar);
  const groundOffset = avatar ? (1 - avatar.bottom) * 100 : 0;
  const portraitHeight = 29;
  const naturalHeight = ((partnerHeight ?? 8) * portraitHeight) / 16;
  const visibleHeight = profile.usePokedexProportions
    ? naturalHeight
    : Math.min(portraitHeight * 1.5, Math.max(10, naturalHeight));
  const partnerVisibleFraction = partnerSpriteMeasurements?.[2] ?? 1;
  const spriteSize = Math.min(
    48,
    34 / Math.max(partnerSpriteMeasurements?.[1] ?? 1, 0.25),
    Math.min(visibleHeight, portraitHeight * (avatar?.bottom ?? 1) + 1) /
      Math.max(partnerVisibleFraction, 0.25),
  );
  const portraitScale = partnerSprite
    ? spriteSize / (visibleHeight / Math.max(partnerVisibleFraction, 0.25))
    : 1;
  const behindTrainer =
    spriteSize * partnerVisibleFraction >=
    portraitHeight * (avatar?.height ?? 1) * portraitScale * 0.85;

  return (
    <article
      className={`trainer-artifact-frame trainer-card trainer-card--${finish.toLowerCase()}${isChampion ? ' trainer-card--champion' : ''}`}
      aria-label={trainerViewLabels.front}
    >
      <TrainerCardFinishEffects finish={finish} polished={isChampion} />
      <div className="trainer-card__decoration" aria-hidden="true">
        <div className="trainer-card__watermark" />
      </div>
      <div className="trainer-card__front">
        <header className="trainer-card__rank">{rank}</header>
        <div className="trainer-card__identity">
          <h2>
            <PlayerName trainer={trainer} fallback={`${site.name} Trainer`} />
          </h2>
          {profile.specialty ? (
            <p className="trainer-card__title">
              <TrainerTitle tier={titleTier} specialty={profile.specialty} />
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
                style={{
                  transform: `scale(${portraitScale})`,
                  transformOrigin: `50% ${avatar.bottom * 100}%`,
                }}
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

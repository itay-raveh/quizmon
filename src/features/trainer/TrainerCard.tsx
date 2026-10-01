import * as styles from './styles/classes.css.ts';
import { site } from '@/app/site';
import { trainerAvatarOptions } from '@/domain/player/trainer-avatars';
import type { PackedSpriteMeasurements } from '@/domain/pokemon/types';
import { PokemonIdentity } from '@/components/PokemonIdentity';
import { PlayerName } from '@/components/PlayerName';
import { Trophy } from '@/components/Trophy';
import {
  getCardFinish,
  getTrainerRank,
  trainerSpecialtyDetails,
  trainerTierLabels,
  trainerViewLabels,
  type TrainerTier,
} from '@/domain/player/trainer-progression';
import type { TrainerStats } from '@/domain/player/progress';
import { CatchCombo } from '@/features/daily/CatchCombo';
import type { TrainerProfile } from '@/lib/storage/trainer-profile-storage';
import { TrainerCardFinishEffects } from './TrainerCardFinishEffects';
import { TrainerTitleMark } from './TrainerTitleMark';

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

const rotomDisplayHeights: Record<string, number> = {
  'rotom-fan': 6,
  'rotom-frost': 18,
  'rotom-heat': 6,
  'rotom-mow': 9,
  'rotom-wash': 9,
};

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
  const height =
    rotomDisplayHeights[profile.partnerPokemon ?? ''] ?? partnerHeight ?? 8;
  const portraitHeight = 29;
  const visibleHeight = Math.min(
    portraitHeight,
    Math.max(5, (height * portraitHeight) / 16),
  );
  const partnerVisibleFraction = partnerSpriteMeasurements?.[2] ?? 1;
  const spriteSize = Math.min(
    48,
    visibleHeight / Math.max(partnerVisibleFraction, 0.25),
  );
  const behindTrainer =
    spriteSize * partnerVisibleFraction >=
    portraitHeight * (avatar?.height ?? 1) * 0.85;

  return (
    <article
      className={`${styles.trainerArtifactFrame} ${styles.trainerCard} ${{ Classic: '', Bronze: styles.trainerCardBronze, Silver: styles.trainerCardSilver, Gold: styles.trainerCardGold }[finish]}${isChampion ? ` ${styles.trainerCardChampion}` : ''}`.trim()}
      aria-label={trainerViewLabels.front}
    >
      <TrainerCardFinishEffects finish={finish} polished={isChampion} />
      <div className={styles.trainerCardDecoration} aria-hidden="true">
        <div className={styles.trainerCardWatermark} />
      </div>
      <div className={styles.trainerCardFront}>
        <header className={styles.trainerCardRank}>
          {rank}
          {isChampion ? <Trophy /> : null}
        </header>
        <div className={styles.trainerCardIdentity}>
          <h2>
            <PlayerName trainer={trainer} fallback={`${site.name} Trainer`} />
          </h2>
          {profile.specialty ? (
            <p
              className={styles.trainerCardTitle}
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
        <div className={styles.trainerCardAvatar}>
          <div className={styles.trainerCardPortrait}>
            {avatar ? (
              <img
                className={styles.trainerCardPortraitImage}
                src={`/trainer-avatars/${avatar.id}.png`}
                alt={`${avatar.name} trainer avatar`}
                width="80"
                height="80"
              />
            ) : (
              <span
                className={styles.trainerCardAvatarMark}
                aria-label="No trainer avatar selected"
              >
                ?
              </span>
            )}
            {partnerSprite && (
              <img
                className={`${styles.trainerCardPartnerSprite}${behindTrainer ? ` ${styles.trainerCardPartnerSpriteBehind}` : ''}`}
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
            className={styles.trainerCardPartnerCaption}
            dexNumber={partnerDexNumber ?? undefined}
            name={partnerName}
          />
        </div>
      </div>
      <div className={styles.trainerCardDetails}>
        <dl className={styles.trainerCardRecord}>
          <div>
            <dt>Pokémon found</dt>
            <dd>
              {record.pokedexFound}
              <small> / {record.pokedexTotal}</small>
            </dd>
          </div>
        </dl>
        <CatchCombo count={record.dayCombo} placement="trainerCard" />
      </div>
    </article>
  );
};

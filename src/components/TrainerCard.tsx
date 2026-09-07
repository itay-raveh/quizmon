import type { Ref } from 'react';
import { site } from '@/app/site';
import { formatDailyDate } from '@/game/daily';
import type { TrainerStats } from '@/game/storage';
import type { TrainerProfile } from '@/game/trainer-profile';
import {
  getCardFinish,
  getTrainerRank,
  trainerSpecialtyLabels,
} from '@/game/trainer';
import { TrainerCardFinishEffects } from './TrainerCardFinishEffects';
import { TrainerTitleMark } from './TrainerTitleMark';
import { PokemonIdentity } from './PokemonIdentity';

interface TrainerCardProps {
  cardRef?: Ref<HTMLElement>;
  partnerDexNumber: number | null;
  partnerSprite: string | null;
  profile: TrainerProfile;
  stats: TrainerStats;
  record: {
    dailyClears: number;
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
  stats,
  record,
}: TrainerCardProps) => {
  const rank = getTrainerRank(stats);
  const finish = getCardFinish(rank);
  const correctAnswers = Object.values(stats.correctCategories).reduce(
    (total, count) => total + count,
    0,
  );
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
        <span>Trainer Card</span>
        <strong>{rank}</strong>
      </header>
      <div className="trainer-card__front">
        <div className="trainer-card__identity">
          <div className="trainer-card__name">
            <span>Name</span>
            <h2>{profile.name || `${site.name} Trainer`}</h2>
          </div>
          {profile.specialty ? (
            <p className="trainer-card__title">
              <TrainerTitleMark earned specialty={profile.specialty} />
              <span>{trainerSpecialtyLabels[profile.specialty]}</span>
            </p>
          ) : null}
        </div>
        <dl className="trainer-card__record">
          <div>
            <dt>Pokédex found</dt>
            <dd>
              {record.pokedexFound}
              <small> / {record.pokedexTotal}</small>
            </dd>
          </div>
          <div>
            <dt>Correct answers</dt>
            <dd>{correctAnswers.toLocaleString('en-US')}</dd>
          </div>
          <div>
            <dt>Daily clears</dt>
            <dd>{record.dailyClears.toLocaleString('en-US')}</dd>
          </div>
          <div>
            <dt>Day combo</dt>
            <dd>
              {record.dayCombo}
              <small> · Best {stats.bestDailyStreak}</small>
            </dd>
          </div>
        </dl>
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
      </div>
      <footer className="trainer-card__footer">
        <span>Trainer since</span>
        <time dateTime={profile.createdAt}>
          {formatDailyDate(profile.createdAt)}
        </time>
      </footer>
    </article>
  );
};

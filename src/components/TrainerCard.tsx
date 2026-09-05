import type { Ref } from 'react';
import { site, siteHostname } from '@/app/site';
import { formatDailyDate } from '@/game/daily';
import { formatPokemonName } from '@/game/format';
import type { TrainerStats } from '@/game/storage';
import type { TrainerProfile } from '@/game/trainer-profile';
import {
  getCardFinish,
  getEarnedTrainerBadgeCount,
  getTrainerRank,
  getTrainerBadges,
  trainerSpecialtyLabels,
  type TrainerBadge,
  type TrainerCardFace,
} from '@/game/trainer';
import { TrainerBadgeMark } from './TrainerBadgeMark';
import { TrainerCardFinishEffects } from './TrainerCardFinishEffects';

interface TrainerCardProps {
  cardRef?: Ref<HTMLElement>;
  face: TrainerCardFace;
  partnerDexNumber: number | null;
  partnerSprite: string | null;
  onBadgeSelect?: (badge: TrainerBadge) => void;
  profile: TrainerProfile;
  stats: TrainerStats;
}

export const TrainerCard = ({
  cardRef,
  face,
  onBadgeSelect,
  partnerDexNumber,
  partnerSprite,
  profile,
  stats,
}: TrainerCardProps) => {
  const rank = getTrainerRank(stats);
  const finish = getCardFinish(rank);
  const badges = getTrainerBadges(stats);
  const earnedBadgeCount = getEarnedTrainerBadgeCount(stats);
  const trainerId = profile.cardNumber.replace(/^QZ-/, '');
  const partnerName = profile.partnerPokemon
    ? formatPokemonName(profile.partnerPokemon)
    : 'Choose partner';

  return (
    <article
      ref={cardRef}
      className={`trainer-card trainer-card--${face} trainer-card--${finish.toLowerCase()} trainer-card--accent-${profile.accent}`}
      aria-label={`Trainer Card ${face === 'front' ? 'front' : 'badge case'}`}
    >
      <TrainerCardFinishEffects
        finish={finish}
        sparkles={rank === 'Champion'}
      />
      {face === 'front' ? (
        <>
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
              <div className="trainer-card__partner-caption">
                <strong>{partnerName}</strong>
                {partnerDexNumber ? (
                  <small>No. {String(partnerDexNumber).padStart(4, '0')}</small>
                ) : null}
              </div>
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
                  <dt>ID No.</dt>
                  <dd>{trainerId}</dd>
                </div>
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
        </>
      ) : (
        <>
          <header className="trainer-card__banner">
            <span>
              {stats.leagueCompleted ? 'Hall of Fame' : 'League Badge Case'}
            </span>
            <strong>
              {stats.leagueCompleted
                ? 'Champion'
                : `${earnedBadgeCount} / ${badges.length}`}
            </strong>
          </header>
          <section
            className="trainer-card__badges"
            aria-label={`League Badge Case: ${earnedBadgeCount} of ${badges.length} earned`}
          >
            {badges.map((badge) => (
              <button
                aria-label={`${badge.label}. ${badge.earned ? 'Earned' : `Locked, ${Math.min(badge.current, badge.goal)} of ${badge.goal}`}. Open badge details.`}
                className="trainer-badge"
                key={badge.id}
                onClick={() => onBadgeSelect?.(badge)}
                type="button"
              >
                <TrainerBadgeMark earned={badge.earned} id={badge.id} />
              </button>
            ))}
          </section>
        </>
      )}
    </article>
  );
};

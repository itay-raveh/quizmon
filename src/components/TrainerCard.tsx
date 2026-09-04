import type { Ref } from 'react';
import { formatDailyDate } from '@/game/daily';
import { formatPokemonName } from '@/game/format';
import type { TrainerStats } from '@/game/storage';
import type { TrainerProfile } from '@/game/trainer-profile';
import {
  formatTrainerStampTier,
  getCardFinish,
  getEarnedTrainerTierCount,
  getTrainerRank,
  getTrainerStamps,
  trainerCategoryLabels,
  type TrainerCardFace,
} from '@/game/trainer';
import { TrainerStampMark } from './TrainerStampMark';

interface TrainerCardProps {
  cardRef?: Ref<HTMLElement>;
  face: TrainerCardFace;
  partnerDexNumber: number | null;
  partnerSprite: string | null;
  profile: TrainerProfile;
  stats: TrainerStats;
}

export const TrainerCard = ({
  cardRef,
  face,
  partnerDexNumber,
  partnerSprite,
  profile,
  stats,
}: TrainerCardProps) => {
  const rank = getTrainerRank(stats);
  const finish = getCardFinish(rank).toLowerCase();
  const stamps = getTrainerStamps(stats);
  const earnedTierCount = getEarnedTrainerTierCount(stats);
  const trainerId = profile.cardNumber.replace(/^QZ-/, '');
  const partnerName = profile.partnerPokemon
    ? formatPokemonName(profile.partnerPokemon)
    : 'Choose partner';

  return (
    <article
      ref={cardRef}
      className={`trainer-card trainer-card--${face} trainer-card--${finish} trainer-card--accent-${profile.accent}`}
      aria-label={`Trainer Card ${face === 'front' ? 'front' : 'records'}`}
    >
      {face === 'front' ? (
        <>
          <header className="trainer-card__banner">
            <span>Quizmon League</span>
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
              <h2>{profile.name || 'Quizmon Trainer'}</h2>
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
            <strong>quizmon.raveh.dev</strong>
          </footer>
        </>
      ) : (
        <>
          <header className="trainer-card__banner">
            <span>Trainer records</span>
            <strong>ID No. {trainerId}</strong>
          </header>
          <dl className="trainer-card__record">
            <div>
              <dt>Games</dt>
              <dd>{stats.gamesCompleted.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Daily clears</dt>
              <dd>{stats.dailyChallengesCompleted.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Perfect rounds</dt>
              <dd>{stats.perfectRounds.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Best Daily Combo</dt>
              <dd>{stats.bestDailyStreak.toLocaleString()}</dd>
            </div>
          </dl>
          <section className="trainer-card__specialty" aria-label="Specialty">
            <span>Specialty</span>
            {stats.specialty ? (
              <p>
                <strong>
                  {trainerCategoryLabels[stats.specialty.category]}
                </strong>
                <small>
                  {stats.specialty.correct} / {stats.specialty.total}
                </small>
              </p>
            ) : (
              <p>
                <strong>Field research underway</strong>
                <small>10 answers unlock a specialty</small>
              </p>
            )}
          </section>
          <section
            className="trainer-card__stamps"
            aria-label={`League stamps: ${earnedTierCount} of 15 tiers earned`}
          >
            {stamps.map((stamp) => (
              <span
                aria-label={`${stamp.label}: ${formatTrainerStampTier(stamp.tier)}. ${stamp.mastered ? 'Mastered.' : `${Math.min(stamp.current, stamp.goal)} of ${stamp.goal}. ${stamp.requirement}.`}`}
                className={`trainer-stamp trainer-stamp--tier-${stamp.tier}`}
                key={stamp.id}
                role="img"
                title={`${stamp.label}: ${stamp.requirement}`}
              >
                <TrainerStampMark id={stamp.id} tier={stamp.tier} />
              </span>
            ))}
          </section>
        </>
      )}
    </article>
  );
};

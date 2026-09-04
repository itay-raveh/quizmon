import { formatTrainerStampTier, type TrainerStamp } from '@/game/trainer';
import { TrainerStampMark } from './TrainerStampMark';

interface TrainerStampCaseProps {
  stamps: readonly TrainerStamp[];
}

export const TrainerStampCase = ({ stamps }: TrainerStampCaseProps) => {
  const earnedTierCount = stamps.reduce(
    (total, stamp) => total + stamp.tier,
    0,
  );

  return (
    <section className="trainer-stamp-case" aria-labelledby="stamp-case-title">
      <header>
        <h2 id="stamp-case-title">Stamp case</h2>
        <span>{earnedTierCount} / 15 tiers</span>
      </header>
      <ul>
        {stamps.map((stamp) => {
          const progress = Math.min(stamp.current, stamp.goal);
          return (
            <li
              className={`trainer-stamp-case--tier-${stamp.tier}`}
              key={stamp.id}
            >
              <TrainerStampMark id={stamp.id} tier={stamp.tier} />
              <span className="trainer-stamp-case__copy">
                <b>{stamp.label}</b>
                <small>{stamp.requirement}</small>
              </span>
              <span className="trainer-stamp-case__progress">
                {stamp.mastered
                  ? 'Mastered'
                  : `${formatTrainerStampTier(stamp.tier)} · ${progress} / ${stamp.goal}`}
              </span>
              <progress
                aria-label={`${stamp.label} progress`}
                max={stamp.goal}
                value={progress}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

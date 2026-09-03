import type { TrainerStamp } from '@/game/trainer';

interface TrainerStampCaseProps {
  stamps: readonly TrainerStamp[];
}

export const TrainerStampCase = ({ stamps }: TrainerStampCaseProps) => {
  const earnedCount = stamps.filter(({ earned }) => earned).length;

  return (
    <section className="trainer-stamp-case" aria-labelledby="stamp-case-title">
      <header>
        <h2 id="stamp-case-title">Stamp case</h2>
        <span>
          {earnedCount} / {stamps.length} earned
        </span>
      </header>
      <ul>
        {stamps.map((stamp) => {
          const progress = Math.min(stamp.current, stamp.goal);
          return (
            <li
              className={stamp.earned ? 'trainer-stamp-case--earned' : ''}
              key={stamp.id}
            >
              <strong aria-hidden="true">{stamp.symbol}</strong>
              <span className="trainer-stamp-case__copy">
                <b>{stamp.label}</b>
                <small>{stamp.requirement}</small>
              </span>
              <span className="trainer-stamp-case__progress">
                {stamp.earned ? 'Earned' : `${progress} / ${stamp.goal}`}
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

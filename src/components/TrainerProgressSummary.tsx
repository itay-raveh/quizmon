import type { TrainerCardFace, TrainerProgressChange } from '@/game/trainer';
import { GameButton } from './GameButton';
import { TrainerBadgeMark } from './TrainerBadgeMark';

interface TrainerProgressSummaryProps {
  leagueVictory: boolean;
  onOpenTrainerCard: (face: TrainerCardFace) => void;
  progressChanges: TrainerProgressChange[];
}

export const TrainerProgressSummary = ({
  leagueVictory,
  onOpenTrainerCard,
  progressChanges,
}: TrainerProgressSummaryProps) => {
  if (!leagueVictory && progressChanges.length === 0) return null;

  const earnedChanges = progressChanges.filter(({ earned }) => earned);
  const ongoingChanges = progressChanges.filter(({ earned }) => !earned);
  const face =
    leagueVictory || progressChanges.some(({ kind }) => kind === 'badge')
      ? 'badges'
      : 'front';

  const renderMark = (change: TrainerProgressChange) =>
    change.kind === 'badge' ? (
      <TrainerBadgeMark earned={change.earned} id={change.id} />
    ) : (
      <span
        className="trainer-progress-change__specialty-mark"
        data-earned={change.earned}
        aria-hidden="true"
      >
        Title
      </span>
    );

  return (
    <GameButton
      className="trainer-progress-summary"
      onClick={() => onOpenTrainerCard(face)}
      tone="quiet"
    >
      <span className="trainer-progress-summary__heading">
        <strong>Trainer progress</strong>
        <small>
          Open Trainer Card{' '}
          <span
            className="trainer-progress-summary__chevron"
            aria-hidden="true"
          >
            ›
          </span>
        </small>
      </span>
      <span className="trainer-progress-summary__changes">
        {leagueVictory || earnedChanges.length > 0 ? (
          <span className="trainer-progress-summary__earned">
            {leagueVictory ? (
              <span className="trainer-progress-change trainer-progress-change--earned">
                <span
                  className="trainer-progress-change__hall-mark"
                  aria-hidden="true"
                >
                  HOF
                </span>
                <span>
                  <small>Milestone earned</small>
                  <strong>Hall of Fame</strong>
                </span>
              </span>
            ) : null}
            {earnedChanges.map((change) => (
              <span
                className={`trainer-progress-change trainer-progress-change--${change.kind} trainer-progress-change--earned`}
                key={`${change.kind}-${change.kind === 'badge' ? change.id : change.specialty}`}
              >
                {renderMark(change)}
                <span>
                  <small>
                    {change.kind === 'badge'
                      ? 'League Badge earned'
                      : 'Specialty unlocked'}
                  </small>
                  <strong>{change.label}</strong>
                </span>
              </span>
            ))}
          </span>
        ) : null}
        {ongoingChanges.map((change) => (
          <span
            className={`trainer-progress-change trainer-progress-change--${change.kind}`}
            key={`${change.kind}-${change.kind === 'badge' ? change.id : change.specialty}`}
          >
            {renderMark(change)}
            <span>
              <strong>{change.label}</strong>
              <small>
                <span>
                  {change.current} / {change.goal}
                </span>
                <span className="trainer-progress-change__delta">
                  +{change.delta}
                </span>
              </small>
              <span
                className="trainer-progress-change__track"
                aria-hidden="true"
              >
                <span
                  style={{
                    width: `${Math.min((change.current / change.goal) * 100, 100)}%`,
                  }}
                />
              </span>
            </span>
          </span>
        ))}
      </span>
    </GameButton>
  );
};

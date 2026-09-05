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

  const face =
    leagueVictory || progressChanges.some(({ kind }) => kind === 'badge')
      ? 'badges'
      : 'front';

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
        {leagueVictory ? (
          <span className="trainer-progress-change">
            <span
              className="trainer-progress-change__hall-mark"
              aria-hidden="true"
            >
              HOF
            </span>
            <span>
              <strong>Hall of Fame</strong>
              <small>Earned</small>
            </span>
          </span>
        ) : null}
        {progressChanges.map((change) => (
          <span
            className={`trainer-progress-change trainer-progress-change--${change.kind}`}
            key={`${change.kind}-${change.kind === 'badge' ? change.id : change.specialty}`}
          >
            {change.kind === 'badge' ? (
              <TrainerBadgeMark earned={change.earned} id={change.id} />
            ) : (
              <span
                className="trainer-progress-change__specialty-mark"
                data-earned={change.earned}
                aria-hidden="true"
              >
                Title
              </span>
            )}
            <span>
              <strong>{change.label}</strong>
              <small>
                {change.earned
                  ? `${change.kind === 'badge' ? 'Badge' : 'Specialty'} earned`
                  : `${change.current} / ${change.goal} · +${change.delta}`}
              </small>
            </span>
          </span>
        ))}
      </span>
    </GameButton>
  );
};

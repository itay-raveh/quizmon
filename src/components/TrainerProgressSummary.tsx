import {
  trainerTierLabels,
  type TrainerProgressChange,
  type TrainerView,
} from '@/game/trainer';
import { GameButton } from './GameButton';
import { CaretRightIcon } from './icons';
import { Trophy } from './Trophy';
import { TrainerBadgeMark } from './TrainerBadgeMark';
import { TrainerTitleMark } from './TrainerTitleMark';

interface TrainerProgressSummaryProps {
  leagueVictory: boolean;
  onOpenHallOfFame: () => void;
  onOpenTrainerCard: (view: TrainerView) => void;
  progressChanges: TrainerProgressChange[];
}

export const TrainerProgressSummary = ({
  leagueVictory,
  onOpenTrainerCard,
  onOpenHallOfFame,
  progressChanges,
}: TrainerProgressSummaryProps) => {
  if (!leagueVictory && progressChanges.length === 0) return null;

  const earnedChanges = progressChanges.filter(({ earned }) => earned);
  const ongoingChanges = progressChanges.filter(({ earned }) => !earned);
  const view: TrainerView = progressChanges.some(({ kind }) => kind === 'badge')
    ? 'badges'
    : 'titles';
  const destinationLabel = leagueVictory
    ? 'Open Hall of Fame'
    : view === 'badges'
      ? 'Open badge case'
      : 'Open Trainer Titles';

  const renderMark = (change: TrainerProgressChange) =>
    change.kind === 'badge' ? (
      <TrainerBadgeMark tier={change.tier} id={change.id} />
    ) : (
      <TrainerTitleMark tier={change.tier} specialty={change.specialty} />
    );

  return (
    <GameButton
      className="trainer-progress-summary"
      onClick={() =>
        leagueVictory ? onOpenHallOfFame() : onOpenTrainerCard(view)
      }
      tone="quiet"
    >
      <span className="trainer-progress-summary__heading">
        <strong>Trainer progress</strong>
        <small>
          {destinationLabel}{' '}
          <CaretRightIcon
            aria-hidden="true"
            className="trainer-progress-summary__chevron"
            weight="bold"
          />
        </small>
      </span>
      <span className="trainer-progress-summary__changes">
        {leagueVictory || earnedChanges.length > 0 ? (
          <span className="trainer-progress-summary__earned">
            {leagueVictory ? (
              <span className="trainer-progress-change trainer-progress-change--earned">
                <Trophy className="trainer-progress-change__hall-mark" />
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
                      ? `League Badge earned · ${trainerTierLabels[change.tier]}`
                      : `Trainer Title unlocked · ${trainerTierLabels[change.tier]}`}
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

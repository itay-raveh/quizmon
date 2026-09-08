import { trainerTierLabels } from '@/game/trainer';
import { TrainerTierProgress } from './TrainerTierProgress';
import type { TrainerBadge } from '@/game/trainer';
import { DialogCloseButton } from './DialogCloseButton';
import { useModalDialog } from './dialog';
import { TrainerBadgeMark } from './TrainerBadgeMark';

interface TrainerBadgeDialogProps {
  badge: TrainerBadge;
  onClose: () => void;
}

export const TrainerBadgeDialog = ({
  badge,
  onClose,
}: TrainerBadgeDialogProps) => {
  const { dialogProps, closeDialog } = useModalDialog(onClose, {
    dismissOnBackdrop: true,
  });
  const progress = Math.min(badge.current, badge.goal);

  return (
    <dialog
      {...dialogProps}
      aria-labelledby="trainer-badge-title"
      className="trainer-badge-dialog"
    >
      <header>
        <h2 id="trainer-badge-title">{badge.label}</h2>
        <DialogCloseButton
          autoFocus
          label="Close badge details"
          onClick={closeDialog}
        />
      </header>
      <div className="trainer-badge-dialog__body">
        <TrainerBadgeMark
          earned={badge.earned}
          tier={badge.tier}
          id={badge.id}
        />
        <div className="trainer-badge-dialog__details">
          <strong className="trainer-badge-dialog__state">
            {badge.earned
              ? `${trainerTierLabels[badge.tier]} badge earned`
              : 'Badge locked'}
          </strong>
          <p>{badge.requirement}</p>
          <div className="trainer-badge-dialog__progress-label">
            <span>
              {badge.tier === 3
                ? 'Total'
                : `Next: ${trainerTierLabels[badge.tier + 1]}`}
            </span>
            <strong>
              {badge.tier === 3
                ? badge.current.toLocaleString()
                : `${progress.toLocaleString()} / ${badge.goal.toLocaleString()}`}
            </strong>
          </div>
          <progress
            aria-label={`${badge.label} progress`}
            max={badge.goal}
            value={progress}
          />
          <TrainerTierProgress
            label={badge.label}
            milestones={badge.milestones}
            tier={badge.tier}
          />
        </div>
      </div>
    </dialog>
  );
};

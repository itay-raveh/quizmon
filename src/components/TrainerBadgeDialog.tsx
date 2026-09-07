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
        <TrainerBadgeMark earned={badge.earned} id={badge.id} />
        <div className="trainer-badge-dialog__details">
          <strong className="trainer-badge-dialog__state">
            {badge.earned ? 'Badge earned' : 'Badge locked'}
          </strong>
          <p>{badge.requirement}</p>
          <div className="trainer-badge-dialog__progress-label">
            <span>Progress</span>
            <strong>
              {progress} / {badge.goal}
            </strong>
          </div>
          <progress
            aria-label={`${badge.label} progress`}
            max={badge.goal}
            value={progress}
          />
        </div>
      </div>
    </dialog>
  );
};

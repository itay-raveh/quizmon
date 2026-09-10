import type { TrainerBadge } from '@/game/trainer';
import { TrainerTierProgress } from './TrainerTierProgress';
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
        <TrainerBadgeMark tier={badge.tier} id={badge.id} />
        <div className="trainer-badge-dialog__details">
          <p>{badge.requirement}</p>
          <TrainerTierProgress progress={badge} />
        </div>
      </div>
    </dialog>
  );
};

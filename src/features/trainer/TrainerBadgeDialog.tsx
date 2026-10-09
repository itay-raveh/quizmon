import { Dialog } from '@base-ui/react/dialog';
import { ModalDialog } from '@/components/ModalDialog';
import { DialogCloseButton } from '@/components/DialogCloseButton';
import type { TrainerBadge } from '@/domain/player/trainer-progression';
import { TrainerBadgeMark } from './TrainerBadgeMark';
import { TrainerTierProgress } from './TrainerTierProgress';

interface TrainerBadgeDialogProps {
  badge: TrainerBadge;
  onClose: () => void;
}

export const TrainerBadgeDialog = ({
  badge,
  onClose,
}: TrainerBadgeDialogProps) => {
  return (
    <ModalDialog
      onClose={onClose}
      dismissOnBackdrop
      className="trainer-badge-dialog"
    >
      <header>
        <Dialog.Title>{badge.label}</Dialog.Title>
        <DialogCloseButton label="Close badge details" />
      </header>
      <div className="trainer-badge-dialog__body">
        <TrainerBadgeMark tier={badge.tier} id={badge.id} />
        <div className="trainer-badge-dialog__details">
          <p>{badge.requirement}</p>
          <TrainerTierProgress progress={badge} />
        </div>
      </div>
    </ModalDialog>
  );
};

import { Dialog } from '@base-ui/react/dialog';
import { ModalDialog } from '@/components/ModalDialog';
import { GameButton } from '@/components/GameButton';

interface LeaveGameDialogProps {
  confirmLabel?: string;
  daily?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LeaveGameDialog = ({
  confirmLabel = 'Leave game',
  daily = false,
  onCancel,
  onConfirm,
}: LeaveGameDialogProps) => {
  return (
    <ModalDialog onClose={onCancel} className="confirm-dialog">
      <div className="confirm-dialog__body">
        <Dialog.Title>Leave this game?</Dialog.Title>
        <Dialog.Description>
          {daily
            ? 'Your Daily attempt will be forfeited.'
            : 'Your answers from this game will be lost.'}
        </Dialog.Description>
        <div className="confirm-dialog__actions">
          <Dialog.Close render={<GameButton tone="quiet" />}>
            Keep playing
          </Dialog.Close>
          <GameButton className="confirm-dialog__confirm" onClick={onConfirm}>
            {confirmLabel}
          </GameButton>
        </div>
      </div>
    </ModalDialog>
  );
};

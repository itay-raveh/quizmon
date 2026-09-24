import { GameButton } from '@/components/GameButton';
import { useModalDialog } from '@/hooks/useModalDialog';

interface LeaveGameDialogProps {
  resumable?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LeaveGameDialog = ({
  resumable = false,
  onCancel,
  onConfirm,
}: LeaveGameDialogProps) => {
  const { dialog, dialogProps, closeDialog: cancel } = useModalDialog(onCancel);

  const confirm = () => {
    dialog.current?.close();
    onConfirm();
  };

  return (
    <dialog
      {...dialogProps}
      aria-describedby="leave-game-description"
      aria-labelledby="leave-game-title"
      className="confirm-dialog"
    >
      <div className="confirm-dialog__body">
        <h2 id="leave-game-title">Leave this game?</h2>
        <p id="leave-game-description">
          {resumable
            ? 'Your Daily progress is saved. Choose this challenge to resume it.'
            : 'Your answers from this game will be lost.'}
        </p>
        <div className="confirm-dialog__actions">
          <GameButton autoFocus tone="quiet" onClick={cancel}>
            Keep playing
          </GameButton>
          <GameButton className="confirm-dialog__confirm" onClick={confirm}>
            Leave game
          </GameButton>
        </div>
      </div>
    </dialog>
  );
};

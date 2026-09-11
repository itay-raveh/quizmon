import { GameButton } from '@/components/GameButton';
import { useModalDialog } from '@/hooks/useModalDialog';

interface LeaveGameDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const LeaveGameDialog = ({
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
      className="leave-game-dialog"
    >
      <div className="leave-game-dialog__body">
        <h2 id="leave-game-title">Leave this game?</h2>
        <p id="leave-game-description">
          Your answers from this game will be lost.
        </p>
        <div className="leave-game-dialog__actions">
          <GameButton autoFocus tone="quiet" onClick={cancel}>
            Keep playing
          </GameButton>
          <GameButton className="leave-game-dialog__confirm" onClick={confirm}>
            Leave game
          </GameButton>
        </div>
      </div>
    </dialog>
  );
};

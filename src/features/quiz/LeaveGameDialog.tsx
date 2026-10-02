import * as styles from '../../components/classes.css.ts';
import { GameButton } from '@/components/GameButton';
import { useModalDialog } from '@/hooks/useModalDialog';

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
      className={styles.confirmDialog}
    >
      <div className={styles.confirmDialogBody}>
        <h2 id="leave-game-title">Leave this game?</h2>
        <p id="leave-game-description">
          {daily
            ? 'Your Daily attempt will be forfeited.'
            : 'Your answers from this game will be lost.'}
        </p>
        <div className={styles.confirmDialogActions}>
          <GameButton autoFocus tone="quiet" onClick={cancel}>
            Keep playing
          </GameButton>
          <GameButton className={styles.confirmDialogConfirm} onClick={confirm}>
            {confirmLabel}
          </GameButton>
        </div>
      </div>
    </dialog>
  );
};

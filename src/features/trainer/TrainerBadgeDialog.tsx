import * as styles from './styles/classes.css.ts';
import { DialogCloseButton } from '@/components/DialogCloseButton';
import type { TrainerBadge } from '@/domain/player/trainer-progression';
import { useModalDialog } from '@/hooks/useModalDialog';
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
  const { dialogProps, closeDialog } = useModalDialog(onClose, {
    dismissOnBackdrop: true,
  });

  return (
    <dialog
      {...dialogProps}
      aria-labelledby="trainer-badge-title"
      className={styles.trainerBadgeDialog}
    >
      <header>
        <h2 id="trainer-badge-title">{badge.label}</h2>
        <DialogCloseButton
          autoFocus
          label="Close badge details"
          onClick={closeDialog}
        />
      </header>
      <div className={styles.trainerBadgeDialogBody}>
        <TrainerBadgeMark tier={badge.tier} id={badge.id} />
        <div className={styles.trainerBadgeDialogDetails}>
          <p>{badge.requirement}</p>
          <TrainerTierProgress progress={badge} />
        </div>
      </div>
    </dialog>
  );
};

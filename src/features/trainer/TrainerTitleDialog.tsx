import { DialogCloseButton } from '@/components/DialogCloseButton';
import { GameButton } from '@/components/GameButton';
import type { TrainerTitle } from '@/domain/player/trainer-progression';
import { useModalDialog } from '@/hooks/useModalDialog';
import { TrainerTierProgress } from './TrainerTierProgress';
import { TrainerTitleMark } from './TrainerTitleMark';

interface TrainerTitleDialogProps {
  onClose: () => void;
  onEquip: (title: TrainerTitle) => void;
  onUnequip: () => void;
  title: TrainerTitle;
}

export const TrainerTitleDialog = ({
  onClose,
  onEquip,
  onUnequip,
  title,
}: TrainerTitleDialogProps) => {
  const { dialogProps, closeDialog } = useModalDialog(onClose, {
    dismissOnBackdrop: true,
  });

  return (
    <dialog
      {...dialogProps}
      aria-labelledby="trainer-title-dialog-heading"
      className="trainer-title-dialog"
    >
      <header>
        <h2 id="trainer-title-dialog-heading">{title.label}</h2>
        <DialogCloseButton
          autoFocus
          label="Close title details"
          onClick={closeDialog}
        />
      </header>
      <div className="trainer-title-dialog__body">
        <TrainerTitleMark tier={title.tier} specialty={title.specialty} />
        <div className="trainer-title-dialog__details">
          <p>{title.description}</p>
          <TrainerTierProgress progress={title} />
          {title.equipped || title.earned ? (
            <GameButton
              sound={title.equipped ? 'toggle-off' : 'toggle-on'}
              tone={title.equipped ? 'quiet' : 'primary'}
              onClick={() => {
                if (title.equipped) onUnequip();
                else onEquip(title);
                closeDialog();
              }}
            >
              {title.equipped ? 'Unequip title' : 'Equip title'}
            </GameButton>
          ) : null}
        </div>
      </div>
    </dialog>
  );
};

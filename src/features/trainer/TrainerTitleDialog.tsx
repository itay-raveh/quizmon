import { Dialog } from '@base-ui/react/dialog';
import { ModalDialog } from '@/components/ModalDialog';
import { DialogCloseButton } from '@/components/DialogCloseButton';
import { GameButton } from '@/components/GameButton';
import type { TrainerTitle } from '@/domain/player/trainer-progression';
import { TrainerTierProgress } from './TrainerTierProgress';
import { TrainerTitleMark } from './TrainerTitleMark';

interface TrainerTitleDialogProps {
  onClose: () => void;
  onEquip?: (title: TrainerTitle) => Promise<boolean>;
  onUnequip?: () => Promise<boolean>;
  title: TrainerTitle;
}

export const TrainerTitleDialog = ({
  onClose,
  onEquip,
  onUnequip,
  title,
}: TrainerTitleDialogProps) => {
  const changeTitle = async () => {
    const saved = title.equipped ? await onUnequip?.() : await onEquip?.(title);
    if (saved) onClose();
  };

  return (
    <ModalDialog
      onClose={onClose}
      dismissOnBackdrop
      className="trainer-title-dialog"
    >
      <header>
        <Dialog.Title>{title.label}</Dialog.Title>
        <DialogCloseButton label="Close title details" />
      </header>
      <div className="trainer-title-dialog__body">
        <TrainerTitleMark tier={title.tier} specialty={title.specialty} />
        <div className="trainer-title-dialog__details">
          <p>{title.description}</p>
          <TrainerTierProgress progress={title} />
          {onEquip && onUnequip && (title.equipped || title.earned) ? (
            <GameButton
              sound={title.equipped ? 'toggle-off' : 'toggle-on'}
              tone={title.equipped ? 'quiet' : 'primary'}
              onClick={() => {
                void changeTitle();
              }}
            >
              {title.equipped ? 'Unequip title' : 'Equip title'}
            </GameButton>
          ) : null}
        </div>
      </div>
    </ModalDialog>
  );
};

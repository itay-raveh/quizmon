import { trainerTierLabels, type TrainerTitle } from '@/game/trainer';
import { TrainerTierProgress } from './TrainerTierProgress';
import { DialogCloseButton } from './DialogCloseButton';
import { GameButton } from './GameButton';
import { useModalDialog } from './dialog';
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
          <strong className="trainer-title-dialog__state">
            {title.equipped
              ? `${trainerTierLabels[title.tier]} title equipped`
              : title.earned
                ? `${trainerTierLabels[title.tier]} title earned`
                : 'Title locked'}
          </strong>
          <p>{title.description}</p>
          <TrainerTierProgress
            progress={title}
            completedLabel="Correct"
            labelClassName="trainer-title-dialog__progress-label"
          />
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

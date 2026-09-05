import type { TrainerTitle } from '@/game/trainer';
import { DialogCloseButton } from './DialogCloseButton';
import { GameButton } from './GameButton';
import { isDialogBackdropPointerDown, useModalDialog } from './dialog';
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
  const dialog = useModalDialog();
  const progress = Math.min(title.current, title.goal);

  const closeDialog = () => {
    dialog.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="trainer-title-dialog-heading"
      className="trainer-title-dialog"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onPointerDown={(event) => {
        if (isDialogBackdropPointerDown(event)) closeDialog();
      }}
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
        <TrainerTitleMark earned={title.earned} specialty={title.specialty} />
        <div className="trainer-title-dialog__details">
          <strong className="trainer-title-dialog__state">
            {title.equipped
              ? 'Title equipped'
              : title.earned
                ? 'Title earned'
                : 'Title locked'}
          </strong>
          <p>{title.description}</p>
          <div className="trainer-title-dialog__progress-label">
            <span>{title.earned ? 'Correct' : 'Progress'}</span>
            <strong>
              {title.earned
                ? title.current.toLocaleString()
                : `${progress} / ${title.goal}`}
            </strong>
          </div>
          <progress
            aria-label={`${title.label} progress`}
            max={title.goal}
            value={progress}
          />
          {title.equipped ? (
            <GameButton
              sound="toggle-off"
              tone="quiet"
              onClick={() => {
                onUnequip();
                closeDialog();
              }}
            >
              Unequip title
            </GameButton>
          ) : title.earned ? (
            <GameButton
              sound="toggle-on"
              onClick={() => {
                onEquip(title);
                closeDialog();
              }}
            >
              Equip title
            </GameButton>
          ) : null}
        </div>
      </div>
    </dialog>
  );
};

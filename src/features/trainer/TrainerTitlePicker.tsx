import { useState } from 'react';
import { DialogCloseButton } from '@/components/DialogCloseButton';
import { GameButton } from '@/components/GameButton';
import { useModalDialog } from '@/hooks/useModalDialog';
import type {
  TrainerSpecialty,
  TrainerTitle as Title,
} from '@/domain/player/trainer-progression';
import { TrainerTitle } from './TrainerTitle';

interface Props {
  titles: readonly Title[];
  value: TrainerSpecialty | null;
  onChange: (specialty: TrainerSpecialty | null) => void;
}

const TitleOptions = ({
  titles,
  value,
  onChange,
  onClose,
}: Props & { onClose: () => void }) => {
  const { dialogProps, closeDialog } = useModalDialog(onClose, {
    dismissOnBackdrop: true,
  });
  const choose = (specialty: TrainerSpecialty | null) => {
    onChange(specialty);
    closeDialog();
  };
  return (
    <dialog
      {...dialogProps}
      className="trainer-title-dialog"
      aria-labelledby="trainer-title-picker-heading"
    >
      <header>
        <h2 id="trainer-title-picker-heading">Trainer title</h2>
        <DialogCloseButton
          autoFocus
          label="Close title picker"
          onClick={closeDialog}
        />
      </header>
      <div className="trainer-title-picker__options">
        <GameButton
          type="button"
          tone="quiet"
          aria-pressed={value === null}
          onClick={() => choose(null)}
        >
          No title
        </GameButton>
        {titles
          .filter((title) => title.earned)
          .map((title) => (
            <GameButton
              key={title.specialty}
              type="button"
              tone="quiet"
              aria-pressed={value === title.specialty}
              aria-label={title.label}
              onClick={() => choose(title.specialty)}
            >
              <TrainerTitle specialty={title.specialty} tier={title.tier} />
            </GameButton>
          ))}
      </div>
    </dialog>
  );
};

export const TrainerTitlePicker = (props: Props) => {
  const [open, setOpen] = useState(false);
  const selected = props.titles.find(
    (title) => title.earned && title.specialty === props.value,
  );
  return (
    <div className="trainer-customizer__title">
      <span id="trainer-title-label">Trainer title</span>
      <GameButton
        type="button"
        tone="quiet"
        aria-labelledby="trainer-title-label trainer-title-value"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span id="trainer-title-value">
          {selected ? (
            <TrainerTitle specialty={selected.specialty} tier={selected.tier} />
          ) : (
            'No title'
          )}
        </span>
      </GameButton>
      {open && <TitleOptions {...props} onClose={() => setOpen(false)} />}
    </div>
  );
};

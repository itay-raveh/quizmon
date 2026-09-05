import { DialogCloseButton } from './DialogCloseButton';
import { GameButton } from './GameButton';
import { useModalDialog } from './dialog';

interface GenerationPromptDialogProps {
  onCancel: () => void;
  onChooseAll: () => void;
  onChooseGenOne: () => void;
}

export const GenerationPromptDialog = ({
  onCancel,
  onChooseAll,
  onChooseGenOne,
}: GenerationPromptDialogProps) => {
  const dialog = useModalDialog();

  const cancel = () => {
    dialog.current?.close();
    onCancel();
  };

  return (
    <dialog
      ref={dialog}
      aria-describedby="generation-prompt-description generation-prompt-note"
      aria-labelledby="generation-prompt-title"
      className="generation-prompt"
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
    >
      <header className="generation-prompt__header">
        <h2 id="generation-prompt-title">Which Pokémon do you know?</h2>
        <DialogCloseButton label="Close generation choice" onClick={cancel} />
      </header>

      <div className="generation-prompt__body">
        <p id="generation-prompt-description">
          Choose which Pokémon should appear in Training.
        </p>
        <div className="generation-prompt__choices">
          <GameButton autoFocus onClick={onChooseGenOne}>
            <strong>Gen I only</strong>
            <span>The original 151</span>
          </GameButton>
          <GameButton onClick={onChooseAll} tone="quiet">
            <strong>All generations</strong>
            <span>Generations I–IX</span>
          </GameButton>
        </div>
        <p className="generation-prompt__note" id="generation-prompt-note">
          You can change this later in Settings.
        </p>
      </div>
    </dialog>
  );
};

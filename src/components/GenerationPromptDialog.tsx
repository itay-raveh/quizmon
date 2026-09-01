import { useEffect, useRef } from 'react';
import { GameButton } from './GameButton';

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
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);

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
        <button
          aria-label="Close generation choice"
          className="dialog-close"
          onClick={cancel}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
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

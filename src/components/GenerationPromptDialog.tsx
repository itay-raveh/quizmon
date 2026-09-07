import { GenerationLabel } from './GenerationLabel';
import { PixelSprite } from './PixelSprite';
import { DialogCloseButton } from './DialogCloseButton';
import { GameButton } from './GameButton';
import { useModalDialog } from './dialog';

interface GenerationPromptDialogProps {
  onCancel: () => void;
  onChooseAll: () => void;
  onChooseGenOne: () => void;
}

const genOnePreview = [
  '/sprites/pokemon/6.png',
  '/sprites/pokemon/25.png',
  '/sprites/pokemon/94.png',
];

const allGenerationsPreview = [
  '/sprites/pokemon/823.png',
  '/sprites/pokemon/25.png',
  '/sprites/pokemon/959.png',
];

const PokemonPreview = ({ sprites }: { sprites: string[] }) => (
  <span aria-hidden="true" className="generation-prompt__preview">
    {sprites.map((sprite) => (
      <PixelSprite
        className="generation-prompt__sprite"
        fetchPriority="auto"
        key={sprite}
        src={sprite}
      />
    ))}
  </span>
);

export const GenerationPromptDialog = ({
  onCancel,
  onChooseAll,
  onChooseGenOne,
}: GenerationPromptDialogProps) => {
  const { dialogProps, closeDialog: cancel } = useModalDialog(onCancel);

  return (
    <dialog
      {...dialogProps}
      aria-describedby="generation-prompt-description generation-prompt-note"
      aria-labelledby="generation-prompt-title"
      className="generation-prompt"
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
            <strong>
              <GenerationLabel generation="I" suffix="only" />
            </strong>
            <PokemonPreview sprites={genOnePreview} />
          </GameButton>
          <GameButton onClick={onChooseAll} tone="quiet">
            <strong>All generations</strong>
            <PokemonPreview sprites={allGenerationsPreview} />
          </GameButton>
        </div>
        <p className="generation-prompt__note" id="generation-prompt-note">
          You can change this later in Settings.
        </p>
      </div>
    </dialog>
  );
};

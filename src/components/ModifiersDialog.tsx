import { useEffect, useMemo, useRef, useState } from 'react';
import { filterPokemon, getCategoryLabel } from '@/game/game';
import {
  generations,
  knowledgeCategories,
  type Generation,
  type KnowledgeCategory,
  type Modifiers,
  type PokemonCatalog,
} from '@/game/types';
import { Checkbox } from './Checkbox';
import { GameButton } from './GameButton';

interface ModifiersDialogProps {
  catalog: PokemonCatalog;
  modifiers: Modifiers;
  onClose: () => void;
  onSave: (modifiers: Modifiers) => void;
}

const toggleValue = <T,>(values: readonly T[], value: T, checked: boolean) =>
  checked ? [...values, value] : values.filter((current) => current !== value);

export const ModifiersDialog = ({
  catalog,
  modifiers,
  onClose,
  onSave,
}: ModifiersDialogProps) => {
  const [draft, setDraft] = useState<Modifiers>(modifiers);
  const [submitted, setSubmitted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const matchingCount = useMemo(
    () => filterPokemon(catalog, draft).length,
    [catalog, draft],
  );
  const hasSelections =
    draft.generations.length > 0 && draft.knowledgeCategories.length > 0;
  const limitIsValid =
    !draft.isLimitActive ||
    (Number.isInteger(draft.limit) &&
      draft.limit >= 1 &&
      draft.limit <= matchingCount);
  const isValid = hasSelections && matchingCount > 0 && limitIsValid;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);

  const closeDialog = () => {
    dialog.current?.close();
    onClose();
  };

  const submit = () => {
    setSubmitted(true);
    if (isValid) {
      dialog.current?.close();
      onSave(draft);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="modifiers-dialog"
      aria-labelledby="modifiers-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const outside =
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom;
        if (outside) closeDialog();
      }}
    >
      <header className="modifiers-dialog__header">
        <h2 id="modifiers-title">Training setup</h2>
        <button
          className="dialog-close"
          aria-label="Close modifiers"
          autoFocus
          onClick={closeDialog}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <form
        className="modifiers-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="modifiers-form__body">
          <fieldset>
            <legend>Generations</legend>
            <p className="field-description">
              Only Pokémon from these generations appear.
            </p>
            <div className="choice-grid choice-grid--compact">
              {generations.map((generation) => (
                <Checkbox
                  checked={draft.generations.includes(generation)}
                  key={generation}
                  label={generation}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      generations: toggleValue<Generation>(
                        current.generations,
                        generation,
                        event.target.checked,
                      ),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Knowledge mix</legend>
            <p className="field-description">
              Pick the kinds of questions you want to practice.
            </p>
            <div className="choice-grid choice-grid--knowledge">
              {knowledgeCategories.map((category) => (
                <Checkbox
                  checked={draft.knowledgeCategories.includes(category)}
                  key={category}
                  label={getCategoryLabel(category)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      knowledgeCategories: toggleValue<KnowledgeCategory>(
                        current.knowledgeCategories,
                        category,
                        event.target.checked,
                      ),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Play style</legend>
            <div className="modifier-list">
              <Checkbox
                checked={draft.speedrunMode}
                description="Move to the next question immediately."
                label="Speedrun mode"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    speedrunMode: event.target.checked,
                  }))
                }
              />
              <Checkbox
                checked={draft.soundEnabled}
                description="Play button and results sounds."
                label="Sound effects"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    soundEnabled: event.target.checked,
                  }))
                }
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>Quiz length</legend>
            <div className="limit-control">
              <Checkbox
                checked={draft.isLimitActive}
                label="Limit questions"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isLimitActive: event.target.checked,
                  }))
                }
              />
              <label className="number-field">
                <span>Questions</span>
                <input
                  disabled={!draft.isLimitActive}
                  max={Math.max(1, matchingCount)}
                  min="1"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      limit: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={draft.limit}
                />
              </label>
            </div>
            <p className="matching-count">
              {matchingCount.toLocaleString()} Pokémon match these filters.
            </p>
          </fieldset>

          {submitted && !isValid ? (
            <p className="form-error" role="alert">
              {!hasSelections || matchingCount === 0
                ? 'Choose at least one generation and question type.'
                : `Choose between 1 and ${matchingCount} questions.`}
            </p>
          ) : null}
        </div>

        <footer className="modifiers-form__actions">
          <GameButton tone="quiet" onClick={closeDialog}>
            Cancel
          </GameButton>
          <GameButton type="submit">Save setup</GameButton>
        </footer>
      </form>
    </dialog>
  );
};

import { useEffect, useMemo, useRef, useState } from 'react';
import { filterPokemon, formatPokemonName } from '@/lib/game';
import {
  formCategories,
  generations,
  type FormCategory,
  type Generation,
  type Modifiers,
  type PokemonCatalog,
} from '@/lib/types';
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
  const closeButton = useRef<HTMLButtonElement>(null);

  const matchingCount = useMemo(
    () => filterPokemon(catalog, draft).length,
    [catalog, draft],
  );
  const hasSelections =
    draft.generations.length > 0 && draft.formCategories.length > 0;
  const limitIsValid =
    !draft.isLimitActive ||
    (Number.isInteger(draft.limit) &&
      draft.limit >= 1 &&
      draft.limit <= matchingCount);
  const isValid = hasSelections && matchingCount > 0 && limitIsValid;

  useEffect(() => {
    closeButton.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const submit = () => {
    setSubmitted(true);
    if (isValid) onSave(draft);
  };

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="modifiers-dialog"
        role="dialog"
        aria-labelledby="modifiers-title"
        aria-modal="true"
      >
        <header className="modifiers-dialog__header">
          <div>
            <p className="eyebrow">Build your challenge</p>
            <h2 id="modifiers-title">Modifiers &amp; filters</h2>
          </div>
          <button
            ref={closeButton}
            className="dialog-close"
            aria-label="Close modifiers"
            onClick={onClose}
            type="button"
          >
            ×
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
              <legend>Forms</legend>
              <p className="field-description">
                Choose which kinds of Pokémon forms can appear.
              </p>
              <div className="choice-grid">
                {formCategories.map((category) => (
                  <Checkbox
                    checked={draft.formCategories.includes(category)}
                    key={category}
                    label={formatPokemonName(category)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        formCategories: toggleValue<FormCategory>(
                          current.formCategories,
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
              <legend>Modifiers</legend>
              <div className="modifier-list">
                <Checkbox
                  checked={draft.randomSprite}
                  description="Pick from every available sprite instead of the official artwork."
                  label="Random sprite"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      randomSprite: event.target.checked,
                    }))
                  }
                />
                <Checkbox
                  checked={draft.whosThatPokemon}
                  description="Turn the Pokémon into a silhouette."
                  label="Who’s that Pokémon?"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      whosThatPokemon: event.target.checked,
                    }))
                  }
                />
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
                  ? 'Choose filters that include at least one Pokémon.'
                  : `Choose between 1 and ${matchingCount} questions.`}
              </p>
            ) : null}
          </div>

          <footer className="modifiers-form__actions">
            <GameButton tone="quiet" onClick={onClose}>
              Cancel
            </GameButton>
            <GameButton type="submit">Save modifiers</GameButton>
          </footer>
        </form>
      </section>
    </div>
  );
};

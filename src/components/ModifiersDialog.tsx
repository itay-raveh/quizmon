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

export type SettingsTab = 'training' | 'experience';

interface ModifiersDialogProps {
  catalog: PokemonCatalog;
  initialTab?: SettingsTab;
  modifiers: Modifiers;
  onClose: () => void;
  onSave: (modifiers: Modifiers) => void;
  trainingChangesApplyNextGame?: boolean;
}

const settingsTabs: readonly SettingsTab[] = ['training', 'experience'];

const toggleValue = <T,>(values: readonly T[], value: T, checked: boolean) =>
  checked ? [...values, value] : values.filter((current) => current !== value);

export const ModifiersDialog = ({
  catalog,
  initialTab = 'training',
  modifiers,
  onClose,
  onSave,
  trainingChangesApplyNextGame = false,
}: ModifiersDialogProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [draft, setDraft] = useState<Modifiers>(modifiers);
  const [submitted, setSubmitted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const tabButtons = useRef<Record<SettingsTab, HTMLButtonElement | null>>({
    experience: null,
    training: null,
  });

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

  const selectTab = (tab: SettingsTab, moveFocus = false) => {
    setActiveTab(tab);
    if (moveFocus) tabButtons.current[tab]?.focus();
  };

  const moveTabFocus = (
    current: SettingsTab,
    direction: 'next' | 'previous',
  ) => {
    const currentIndex = settingsTabs.indexOf(current);
    const offset = direction === 'next' ? 1 : -1;
    const nextIndex =
      (currentIndex + offset + settingsTabs.length) % settingsTabs.length;
    selectTab(settingsTabs[nextIndex] ?? 'training', true);
  };

  const submit = () => {
    setSubmitted(true);
    if (!isValid) {
      selectTab('training');
      return;
    }

    dialog.current?.close();
    onSave(draft);
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
        <h2 id="modifiers-title">Settings</h2>
        <button
          className="dialog-close"
          aria-label="Close settings"
          autoFocus
          onClick={closeDialog}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div
        className="settings-tabs"
        aria-label="Settings sections"
        role="tablist"
      >
        {settingsTabs.map((tab) => (
          <button
            ref={(element) => {
              tabButtons.current[tab] = element;
            }}
            aria-controls={`settings-panel-${tab}`}
            aria-selected={activeTab === tab}
            className="settings-tab"
            id={`settings-tab-${tab}`}
            key={tab}
            onClick={() => selectTab(tab)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                moveTabFocus(tab, 'next');
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                moveTabFocus(tab, 'previous');
              }
            }}
            role="tab"
            tabIndex={activeTab === tab ? 0 : -1}
            type="button"
          >
            {tab === 'training' ? 'Training' : 'Experience'}
          </button>
        ))}
      </div>

      <form
        className="modifiers-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="modifiers-form__body">
          <div
            aria-labelledby="settings-tab-training"
            hidden={activeTab !== 'training'}
            id="settings-panel-training"
            role="tabpanel"
          >
            {trainingChangesApplyNextGame ? (
              <p className="settings-note">
                Training changes apply to your next game.
              </p>
            ) : null}

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
          <div
            aria-labelledby="settings-tab-experience"
            hidden={activeTab !== 'experience'}
            id="settings-panel-experience"
            role="tabpanel"
          >
            <fieldset>
              <legend>Play experience</legend>
              <p className="field-description">
                These changes apply as soon as you save.
              </p>
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
          </div>
        </div>

        <footer className="modifiers-form__actions">
          <GameButton tone="quiet" onClick={closeDialog}>
            Cancel
          </GameButton>
          <GameButton type="submit">Save settings</GameButton>
        </footer>
      </form>
    </dialog>
  );
};

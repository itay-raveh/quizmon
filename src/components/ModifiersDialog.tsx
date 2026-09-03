import { useEffect, useMemo, useRef, useState } from 'react';
import type { Modifiers, PokemonCatalog } from '@/game/types';
import { ExperienceSettings } from './ExperienceSettings';
import { GameButton } from './GameButton';
import { TrainingSettings } from './TrainingSettings';
import {
  getRoundLength,
  getTrainingSettingsValidation,
} from './trainingSettingsModel';

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
export const ModifiersDialog = ({
  catalog,
  initialTab = 'training',
  modifiers,
  onClose,
  onSave,
  trainingChangesApplyNextGame = false,
}: ModifiersDialogProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [draft, setDraft] = useState<Modifiers>(() => ({
    ...modifiers,
    limit: getRoundLength(modifiers.limit),
  }));
  const [submitted, setSubmitted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitle = useRef<HTMLHeadingElement>(null);
  const generationsHeading = useRef<HTMLHeadingElement>(null);
  const questionTypesHeading = useRef<HTMLHeadingElement>(null);
  const tabButtons = useRef<Record<SettingsTab, HTMLButtonElement | null>>({
    experience: null,
    training: null,
  });

  const validation = useMemo(
    () => getTrainingSettingsValidation(catalog, draft),
    [catalog, draft],
  );

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    dialogTitle.current?.focus();
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
    if (!validation.isValid) {
      selectTab('training');
      window.setTimeout(() => {
        const target = !validation.generationsAreValid
          ? generationsHeading.current
          : questionTypesHeading.current;
        target?.focus();
        target?.scrollIntoView({ block: 'center' });
      });
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
        <h2 id="modifiers-title" ref={dialogTitle} tabIndex={-1}>
          Settings
        </h2>
        <button
          className="dialog-close"
          aria-label="Close settings"
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
            <TrainingSettings
              draft={draft}
              generationsHeading={generationsHeading}
              onChange={setDraft}
              questionTypesHeading={questionTypesHeading}
              submitted={submitted}
              trainingChangesApplyNextGame={trainingChangesApplyNextGame}
              {...validation}
            />
          </div>
          <div
            aria-labelledby="settings-tab-experience"
            hidden={activeTab !== 'experience'}
            id="settings-panel-experience"
            role="tabpanel"
          >
            <ExperienceSettings draft={draft} onChange={setDraft} />
          </div>
        </div>

        <div className="modifiers-form__actions">
          <GameButton tone="quiet" onClick={closeDialog}>
            Cancel
          </GameButton>
          <GameButton type="submit">Save settings</GameButton>
        </div>
      </form>
    </dialog>
  );
};

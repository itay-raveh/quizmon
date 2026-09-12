import { DialogCloseButton } from '@/components/DialogCloseButton';
import { GameButton } from '@/components/GameButton';
import { SoundButton } from '@/components/SoundButton';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { formGroups } from '@/domain/pokemon/types';
import type { GameSettings } from '@/domain/settings/types';
import { useUpdateState } from '@/features/installation/update-session';
import { useModalDialog } from '@/hooks/useModalDialog';
import { useMemo, useRef } from 'react';
import { BackupSettings } from './BackupSettings';
import { ExperienceSettings } from './ExperienceSettings';
import { TrainingSettings } from './TrainingSettings';
import { getTrainingSettingsValidation } from './settings-validation';

const settingsTabLabels = {
  training: 'Training',
  experience: 'Experience',
  backup: 'Backup',
} as const;
type SettingsTab = keyof typeof settingsTabLabels;
const settingsTabs = Object.keys(settingsTabLabels) as SettingsTab[];

interface SettingsDialogProps {
  catalog: PokemonCatalog;
  settings: GameSettings;
  onClose: () => void;
  onSave: (settings: GameSettings) => void;
  trainingChangesApplyNextGame?: boolean;
}

export const SettingsDialog = ({
  catalog,
  settings,
  onClose,
  onSave,
  trainingChangesApplyNextGame = false,
}: SettingsDialogProps) => {
  const [activeTab, setActiveTab] = useUpdateState<SettingsTab>(
    'settings-tab',
    'training',
  );
  const [storedDraft, setDraft] = useUpdateState('settings-draft', settings);
  const draft = useMemo(
    () => ({
      ...storedDraft,
      formGroups: storedDraft.formGroups ?? [...formGroups],
    }),
    [storedDraft],
  );
  const [submitted, setSubmitted] = useUpdateState('settings-submitted', false);
  const dialogTitle = useRef<HTMLHeadingElement>(null);
  const { dialog, dialogProps, closeDialog } = useModalDialog(onClose, {
    initialFocus: dialogTitle,
    dismissOnBackdrop: true,
  });
  const generationsHeading = useRef<HTMLHeadingElement>(null);
  const formGroupsHeading = useRef<HTMLHeadingElement>(null);
  const questionTypesHeading = useRef<HTMLHeadingElement>(null);
  const tabButtons = useRef<Record<SettingsTab, HTMLButtonElement | null>>({
    backup: null,
    experience: null,
    training: null,
  });

  const {
    difficulty,
    questionSelection,
    trainingMode,
    generations,
    formGroups: selectedForms,
    questionTypes,
  } = draft;
  const validation = useMemo(
    () =>
      getTrainingSettingsValidation(catalog, {
        difficulty,
        questionSelection,
        trainingMode,
        generations,
        formGroups: selectedForms,
        questionTypes,
      }),
    [
      catalog,
      difficulty,
      questionSelection,
      trainingMode,
      generations,
      selectedForms,
      questionTypes,
    ],
  );

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
          : !validation.formGroupsAreValid
            ? formGroupsHeading.current
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
      {...dialogProps}
      className="settings-dialog"
      aria-labelledby="settings-title"
    >
      <header className="settings-dialog__header">
        <h2 id="settings-title" ref={dialogTitle} tabIndex={-1}>
          Settings
        </h2>
        <DialogCloseButton label="Close settings" onClick={closeDialog} />
      </header>

      <div
        className="settings-tabs"
        aria-label="Settings sections"
        role="tablist"
      >
        {settingsTabs.map((tab) => (
          <SoundButton
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
          >
            {settingsTabLabels[tab]}
          </SoundButton>
        ))}
      </div>

      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="settings-form__body">
          <div
            aria-labelledby="settings-tab-training"
            hidden={activeTab !== 'training'}
            id="settings-panel-training"
            role="tabpanel"
          >
            <TrainingSettings
              draft={draft}
              generationsHeading={generationsHeading}
              formGroupsHeading={formGroupsHeading}
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
          <div
            aria-labelledby="settings-tab-backup"
            hidden={activeTab !== 'backup'}
            id="settings-panel-backup"
            role="tabpanel"
          >
            <BackupSettings />
          </div>
        </div>

        <div className="settings-form__actions">
          <GameButton tone="quiet" onClick={closeDialog}>
            Cancel
          </GameButton>
          <GameButton type="submit">Save settings</GameButton>
        </div>
      </form>
    </dialog>
  );
};

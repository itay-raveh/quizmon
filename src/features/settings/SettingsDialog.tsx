import { useMemo, useRef, useState } from 'react';
import { DialogCloseButton } from '../../components/DialogCloseButton';
import { GameButton } from '../../components/GameButton';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { formGroups } from '../../domain/pokemon/types';
import type { GameSettings } from '../../domain/settings/types';
import { useModalDialog } from '../../hooks/useModalDialog';
import { selectedAccount } from '../account/account';
import { useUpdateState } from '../installation/update-session';
import { BackupSettings } from './BackupSettings';
import { ExperienceSettings } from './ExperienceSettings';
import { getTrainingSettingsValidation } from './settings-validation';
import { TrainingSettings } from './TrainingSettings';

export type SettingsSection = 'training' | 'general';

interface SettingsDialogProps {
  catalog: PokemonCatalog;
  section?: SettingsSection;
  settings: GameSettings;
  onClose: () => void;
  onSave: (settings: GameSettings) => void | Promise<void>;
  trainingChangesApplyNextGame?: boolean;
}

export const SettingsDialog = ({
  catalog,
  section = 'general',
  settings,
  onClose,
  onSave,
  trainingChangesApplyNextGame = false,
}: SettingsDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
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
  const { dialogProps, closeDialog } = useModalDialog(onClose, {
    initialFocus: dialogTitle,
    dismissOnBackdrop: true,
  });
  const generationsHeading = useRef<HTMLHeadingElement>(null);
  const formGroupsHeading = useRef<HTMLHeadingElement>(null);
  const questionTypesHeading = useRef<HTMLHeadingElement>(null);

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
      section === 'training'
        ? getTrainingSettingsValidation(catalog, {
            difficulty,
            questionSelection,
            trainingMode,
            generations,
            formGroups: selectedForms,
            questionTypes,
          })
        : null,
    [
      section,
      catalog,
      difficulty,
      questionSelection,
      trainingMode,
      generations,
      selectedForms,
      questionTypes,
    ],
  );

  const submit = async () => {
    if (saving) return;
    setSubmitted(true);
    if (validation && !validation.isValid) {
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

    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      {...dialogProps}
      className="settings-dialog"
      aria-labelledby="settings-title"
    >
      <header className="settings-dialog__header">
        <h2 id="settings-title" ref={dialogTitle} tabIndex={-1}>
          {section === 'training' ? 'Customize training' : 'Settings'}
        </h2>
        <DialogCloseButton
          label={
            section === 'training'
              ? 'Close training settings'
              : 'Close settings'
          }
          onClick={closeDialog}
        />
      </header>

      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="settings-form__body" inert={saving}>
          {validation ? (
            <>
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
            </>
          ) : (
            <>
              <ExperienceSettings draft={draft} onChange={setDraft} />
              {!selectedAccount() && (
                <details
                  className="settings-backup"
                  onToggle={(event) => setBackupOpen(event.currentTarget.open)}
                >
                  <summary>Backup &amp; restore</summary>
                  {backupOpen && <BackupSettings />}
                </details>
              )}
            </>
          )}
        </div>

        <div className="settings-form__actions">
          <GameButton tone="quiet" onClick={closeDialog}>
            Cancel
          </GameButton>
          <GameButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </GameButton>
        </div>
      </form>
    </dialog>
  );
};

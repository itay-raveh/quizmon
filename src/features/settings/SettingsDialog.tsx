import { useMemo, useRef, useState } from 'react';
import { DialogCloseButton } from '../../components/DialogCloseButton';
import { GameButton } from '../../components/GameButton';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { savedSettingsSchema } from '../../domain/player/schemas/player-data';
import type { GameSettings } from '../../domain/settings/types';
import { useModalDialog } from '../../hooks/useModalDialog';
import { selectedAccount } from '../account/account';
import {
  readUpdateState,
  useUpdateSnapshot,
  useUpdateState,
} from '../../lib/storage/update-reload-state';
import { BackupSettings } from './BackupSettings';
import { ExperienceSettings } from './ExperienceSettings';
import { getTrainingSettingsValidation } from './settings-validation';
import { TrainingSettings } from './TrainingSettings';

export type SettingsSection = 'training' | 'generations' | 'level' | 'general';

const sectionTitles = {
  training: 'Custom questions',
  generations: 'Generations and Forms',
  level: 'Training level',
  general: 'Settings',
};

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
  const [draft, setDraft] = useState<GameSettings>(() => {
    const restored = readUpdateState('settings-draft', settings);
    const parsed = savedSettingsSchema.safeParse(restored);
    return parsed.success ? parsed.data : settings;
  });
  useUpdateSnapshot('settings-draft', draft);
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
    level,
    questionSelection,
    trainingMode,
    generations,
    formGroups: selectedForms,
    questionTypes,
  } = draft;
  const validation = useMemo(
    () =>
      section !== 'general'
        ? getTrainingSettingsValidation(catalog, {
            level,
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
      level,
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
        const target =
          section !== 'generations' && section !== 'training'
            ? dialogTitle.current
            : !validation.generationsAreValid
              ? generationsHeading.current
              : !validation.formGroupsAreValid
                ? formGroupsHeading.current
                : questionTypesHeading.current;
        (target ?? dialogTitle.current)?.focus();
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
      className={`settings-dialog${section === 'level' ? ' settings-dialog--level' : ''}`}
      aria-labelledby="settings-title"
    >
      <header className="settings-dialog__header">
        <h2 id="settings-title" ref={dialogTitle} tabIndex={-1}>
          {sectionTitles[section]}
        </h2>
        <DialogCloseButton
          label={`Close ${sectionTitles[section]}`}
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
          {section !== 'general' && validation ? (
            <>
              <TrainingSettings
                section={section}
                draft={draft}
                generationsHeading={generationsHeading}
                formGroupsHeading={formGroupsHeading}
                onChange={setDraft}
                questionTypesHeading={questionTypesHeading}
                submitted={submitted}
                trainingChangesApplyNextGame={trainingChangesApplyNextGame}
                {...validation}
              />
              {submitted &&
                !validation.isValid &&
                section !== 'training' &&
                validation.generationsAreValid &&
                validation.formGroupsAreValid && (
                  <p className="form-error" role="alert">
                    No questions match these settings. Choose another{' '}
                    {section === 'level' ? 'level' : 'generation or form'}, or
                    cancel and adjust Custom questions.
                  </p>
                )}
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

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  filterPokemon,
  getQuestionTypeDescription,
  getQuestionTypeLabel,
} from '@/game/game';
import {
  generations,
  type Generation,
  type Modifiers,
  type PokemonCatalog,
  type QuestionType,
} from '@/game/types';
import {
  questionTypeGroups,
  questionTypes,
  questionRegistry,
  type QuestionTypeGroup,
} from '@/game/questions/registry';
import { Checkbox } from './Checkbox';
import { GameButton } from './GameButton';
import { SelectionTile } from './SelectionTile';

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
const roundLengths = [
  { label: 'Quick', value: 5 },
  { label: 'Standard', value: 10 },
  { label: 'Long', value: 20 },
] as const;

const getRoundLength = (limit: number) =>
  roundLengths.some(({ value }) => value === limit) ? limit : 10;

const toggleValue = <T,>(values: readonly T[], value: T, checked: boolean) =>
  checked ? [...values, value] : values.filter((current) => current !== value);

const getGroupedQuestionTypes = (group: QuestionTypeGroup) =>
  questionTypes.filter(
    (questionType) => questionRegistry[questionType].group === group,
  );

const getInitialExpandedGroup = (
  selectedQuestionTypes: readonly QuestionType[],
): QuestionTypeGroup =>
  questionTypeGroups.find(({ id }) => {
    const groupedQuestionTypes = getGroupedQuestionTypes(id);
    const selectedCount = groupedQuestionTypes.filter((questionType) =>
      selectedQuestionTypes.includes(questionType),
    ).length;
    return selectedCount > 0 && selectedCount < groupedQuestionTypes.length;
  })?.id ?? questionTypeGroups[0].id;

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
  const [explainedQuestionType, setExplainedQuestionType] =
    useState<QuestionType>('pokedex-scan');
  const [expandedGroup, setExpandedGroup] = useState<QuestionTypeGroup | null>(
    () => getInitialExpandedGroup(modifiers.questionTypes),
  );
  const [submitted, setSubmitted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitle = useRef<HTMLHeadingElement>(null);
  const generationsHeading = useRef<HTMLHeadingElement>(null);
  const questionTypesHeading = useRef<HTMLHeadingElement>(null);
  const tabButtons = useRef<Record<SettingsTab, HTMLButtonElement | null>>({
    experience: null,
    training: null,
  });

  const matchingCount = useMemo(
    () => filterPokemon(catalog, draft).length,
    [catalog, draft],
  );
  const generationsAreValid = draft.generations.length > 0;
  const questionTypesAreValid = draft.questionTypes.length > 0;
  const hasSelections = generationsAreValid && questionTypesAreValid;
  const allGenerationsSelected =
    draft.generations.length === generations.length;
  const allQuestionTypesSelected =
    draft.questionTypes.length === questionTypes.length;
  const isValid = hasSelections && matchingCount > 0;

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
    if (!isValid) {
      selectTab('training');
      if (!questionTypesAreValid) setExpandedGroup(questionTypeGroups[0].id);
      window.setTimeout(() => {
        const target = !generationsAreValid
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
            {trainingChangesApplyNextGame ? (
              <p className="settings-note">
                Training changes apply to your next game.
              </p>
            ) : null}

            <section className="settings-section">
              <div className="settings-section__heading">
                <h3
                  id="generations-title"
                  ref={generationsHeading}
                  tabIndex={-1}
                >
                  Generations
                </h3>
                <button
                  aria-label={`${allGenerationsSelected ? 'Deselect' : 'Select'} all generations`}
                  className="selection-toggle"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      generations: allGenerationsSelected
                        ? []
                        : [...generations],
                    }))
                  }
                  type="button"
                >
                  {allGenerationsSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div
                aria-describedby={
                  submitted && !generationsAreValid
                    ? 'generations-error'
                    : undefined
                }
                aria-invalid={submitted && !generationsAreValid}
                aria-labelledby="generations-title"
                className="selection-grid selection-grid--generations"
                role="group"
              >
                {generations.map((generation) => (
                  <SelectionTile
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
                    variant="generation"
                  />
                ))}
              </div>
              {submitted && !generationsAreValid ? (
                <p className="form-error" id="generations-error" role="alert">
                  Choose at least one generation.
                </p>
              ) : null}
            </section>

            <fieldset className="round-length-settings">
              <legend>Round length</legend>
              <div className="selection-grid selection-grid--round-length">
                {roundLengths.map(({ label, value }) => (
                  <SelectionTile
                    checked={draft.limit === value}
                    inputType="radio"
                    key={value}
                    label={
                      <>
                        <strong>{value}</strong>
                        <span>{label}</span>
                      </>
                    }
                    name="round-length"
                    onChange={(event) => {
                      if (!event.target.checked) return;
                      setDraft((current) => ({ ...current, limit: value }));
                    }}
                    variant="round-length"
                  />
                ))}
              </div>
            </fieldset>

            <section
              className="question-type-settings"
              aria-labelledby="question-types-title"
              aria-describedby={
                submitted && (!questionTypesAreValid || matchingCount === 0)
                  ? 'question-types-error'
                  : undefined
              }
              aria-invalid={
                submitted && (!questionTypesAreValid || matchingCount === 0)
              }
            >
              <div className="settings-section__heading">
                <h3
                  id="question-types-title"
                  ref={questionTypesHeading}
                  tabIndex={-1}
                >
                  Question types
                </h3>
                <button
                  aria-label={`${allQuestionTypesSelected ? 'Deselect' : 'Select'} all question types`}
                  className="selection-toggle"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      questionTypes: allQuestionTypesSelected
                        ? []
                        : [...questionTypes],
                    }))
                  }
                  type="button"
                >
                  {allQuestionTypesSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {submitted && (!questionTypesAreValid || matchingCount === 0) ? (
                <p
                  className="form-error"
                  id="question-types-error"
                  role="alert"
                >
                  {questionTypesAreValid
                    ? 'Choose a different generation or question type combination.'
                    : 'Choose at least one question type.'}
                </p>
              ) : null}
              {questionTypeGroups.map((group) => {
                const groupedQuestionTypes = getGroupedQuestionTypes(group.id);
                const selectedCount = groupedQuestionTypes.filter(
                  (questionType) => draft.questionTypes.includes(questionType),
                ).length;
                const expanded = expandedGroup === group.id;
                const titleId = `question-type-group-${group.id}-title`;
                const panelId = `question-type-group-${group.id}-panel`;

                return (
                  <section
                    className="question-type-group"
                    aria-labelledby={titleId}
                    key={group.id}
                  >
                    <h4>
                      <button
                        aria-controls={panelId}
                        aria-expanded={expanded}
                        className="question-type-group__disclosure"
                        id={titleId}
                        onClick={() =>
                          setExpandedGroup((current) =>
                            current === group.id ? null : group.id,
                          )
                        }
                        type="button"
                      >
                        <span>{group.label}</span>
                        <span className="question-type-group__count">
                          {selectedCount} / {groupedQuestionTypes.length}
                          <span className="visually-hidden"> selected</span>
                        </span>
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </h4>
                    <div
                      className="question-type-group__panel"
                      hidden={!expanded}
                      id={panelId}
                    >
                      <div
                        aria-label={`${group.label} question types`}
                        className="selection-grid selection-grid--question-types"
                        role="group"
                      >
                        {groupedQuestionTypes.map((questionType) => {
                          const label = getQuestionTypeLabel(questionType);
                          const checked =
                            draft.questionTypes.includes(questionType);
                          return (
                            <div
                              className={`question-type-tile${checked ? ' question-type-tile--selected' : ''}`}
                              key={questionType}
                            >
                              <SelectionTile
                                checked={checked}
                                label={label}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...current,
                                    questionTypes: toggleValue<QuestionType>(
                                      current.questionTypes,
                                      questionType,
                                      event.target.checked,
                                    ),
                                  }))
                                }
                              />
                              <button
                                aria-label={`About ${label}`}
                                className="question-type-tile__help"
                                onClick={() =>
                                  setExplainedQuestionType(questionType)
                                }
                                popoverTarget="question-type-help"
                                popoverTargetAction="show"
                                type="button"
                              >
                                <span aria-hidden="true">?</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                );
              })}
            </section>
          </div>
          <div
            aria-labelledby="settings-tab-experience"
            hidden={activeTab !== 'experience'}
            id="settings-panel-experience"
            role="tabpanel"
          >
            <fieldset>
              <legend>Play experience</legend>
              <div className="modifier-list">
                <Checkbox
                  checked={draft.speedrunMode}
                  description="Shorten the answer reveal before the next question."
                  label="Quick transitions"
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

        <div className="modifiers-form__actions">
          <GameButton tone="quiet" onClick={closeDialog}>
            Cancel
          </GameButton>
          <GameButton type="submit">Save settings</GameButton>
        </div>
      </form>

      <div
        className="question-type-help"
        id="question-type-help"
        popover="auto"
        role="note"
      >
        <button
          aria-label="Close question type explanation"
          className="question-type-help__close"
          popoverTarget="question-type-help"
          popoverTargetAction="hide"
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <strong>{getQuestionTypeLabel(explainedQuestionType)}</strong>
        <p>{getQuestionTypeDescription(explainedQuestionType)}</p>
      </div>
    </dialog>
  );
};

import {
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { getQuestionTypeDescription, getQuestionTypeLabel } from '@/game/game';
import {
  questionRegistry,
  questionTypeGroups,
  questionTypes,
  type QuestionTypeGroup,
} from '@/game/questions/registry';
import type { Modifiers, QuestionType } from '@/game/types';
import { CaretDownIcon, QuestionIcon, XIcon } from './icons';
import { SelectionTile } from './SelectionTile';
import { SoundButton } from './SoundButton';

interface QuestionTypeSettingsProps {
  draft: Modifiers;
  heading: RefObject<HTMLHeadingElement | null>;
  matchingCount: number;
  onChange: Dispatch<SetStateAction<Modifiers>>;
  questionTypesAreValid: boolean;
  submitted: boolean;
}

const getGroupedQuestionTypes = (group: QuestionTypeGroup) =>
  questionTypes.filter(
    (questionType) => questionRegistry[questionType].group === group,
  );

const getInitialExpandedGroup = (
  selectedQuestionTypes: readonly QuestionType[],
): QuestionTypeGroup => {
  const selected = new Set(selectedQuestionTypes);
  return (
    questionTypeGroups.find(({ id }) => {
      const groupedQuestionTypes = getGroupedQuestionTypes(id);
      const selectedCount = groupedQuestionTypes.filter((questionType) =>
        selected.has(questionType),
      ).length;
      return selectedCount > 0 && selectedCount < groupedQuestionTypes.length;
    })?.id ?? questionTypeGroups[0].id
  );
};

const toggleQuestionType = (
  current: Modifiers,
  questionType: QuestionType,
  checked: boolean,
): Modifiers => ({
  ...current,
  questionTypes: checked
    ? [...current.questionTypes, questionType]
    : current.questionTypes.filter(
        (currentType) => currentType !== questionType,
      ),
});

export const QuestionTypeSettings = ({
  draft,
  heading,
  matchingCount,
  onChange,
  questionTypesAreValid,
  submitted,
}: QuestionTypeSettingsProps) => {
  const [explainedQuestionType, setExplainedQuestionType] =
    useState<QuestionType>('pokedex-scan');
  const [expandedGroup, setExpandedGroup] = useState<QuestionTypeGroup | null>(
    () => getInitialExpandedGroup(draft.questionTypes),
  );
  const availableQuestionTypes = questionTypes.filter(
    (type) => type !== 'generation-roundup' || draft.generations.length >= 2,
  );
  const selectedQuestionTypes = new Set(
    availableQuestionTypes.filter((type) => draft.questionTypes.includes(type)),
  );
  const allSelected =
    selectedQuestionTypes.size === availableQuestionTypes.length;
  const hasError = submitted && (!questionTypesAreValid || matchingCount === 0);
  const visibleExpandedGroup =
    submitted && !questionTypesAreValid
      ? questionTypeGroups[0].id
      : expandedGroup;

  return (
    <>
      <section
        className="question-type-settings"
        aria-labelledby="question-types-title"
        aria-describedby={hasError ? 'question-types-error' : undefined}
        aria-invalid={hasError}
      >
        <div className="settings-section__heading">
          <h3 id="question-types-title" ref={heading} tabIndex={-1}>
            Question types
          </h3>
          <SoundButton
            aria-label={`${allSelected ? 'Deselect' : 'Select'} all question types`}
            className="selection-toggle"
            onClick={() =>
              onChange((current) => ({
                ...current,
                questionTypes: allSelected ? [] : availableQuestionTypes,
              }))
            }
            sound={allSelected ? 'toggle-off' : 'toggle-on'}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </SoundButton>
        </div>
        {hasError ? (
          <p className="form-error" id="question-types-error" role="alert">
            {draft.questionTypes.length > 0 &&
            draft.questionTypes.every(
              (type) => type === 'generation-roundup',
            ) &&
            draft.generations.length < 2
              ? 'Select at least two generations for Generation roundup.'
              : questionTypesAreValid
                ? 'Choose a different generation or question type combination.'
                : 'Choose at least one question type.'}
          </p>
        ) : null}
        {questionTypeGroups.map((group) => {
          const groupedQuestionTypes = getGroupedQuestionTypes(group.id);
          const selectedCount = groupedQuestionTypes.filter((questionType) =>
            selectedQuestionTypes.has(questionType),
          ).length;
          const expanded = visibleExpandedGroup === group.id;
          const titleId = `question-type-group-${group.id}-title`;
          const panelId = `question-type-group-${group.id}-panel`;

          return (
            <section
              className="question-type-group"
              aria-labelledby={titleId}
              key={group.id}
            >
              <h4>
                <SoundButton
                  aria-controls={panelId}
                  aria-expanded={expanded}
                  className="question-type-group__disclosure"
                  id={titleId}
                  onClick={() =>
                    setExpandedGroup((current) =>
                      current === group.id ? null : group.id,
                    )
                  }
                >
                  <span>{group.label}</span>
                  <span className="question-type-group__count">
                    {selectedCount} / {groupedQuestionTypes.length}
                    <span className="visually-hidden"> selected</span>
                  </span>
                  <CaretDownIcon aria-hidden="true" weight="bold" />
                </SoundButton>
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
                    const checked = selectedQuestionTypes.has(questionType);
                    return (
                      <div
                        className={`question-type-tile${checked ? ' question-type-tile--selected' : ''}`}
                        key={questionType}
                      >
                        <SelectionTile
                          checked={checked}
                          disabled={
                            !availableQuestionTypes.includes(questionType)
                          }
                          label={label}
                          onChange={(event) =>
                            onChange((current) =>
                              toggleQuestionType(
                                current,
                                questionType,
                                event.target.checked,
                              ),
                            )
                          }
                        />
                        <SoundButton
                          aria-label={`About ${label}`}
                          className="question-type-tile__help"
                          onClick={() => setExplainedQuestionType(questionType)}
                          popoverTarget="question-type-help"
                          popoverTargetAction="show"
                        >
                          <span aria-hidden="true">
                            <QuestionIcon weight="bold" />
                          </span>
                        </SoundButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </section>

      <div
        className="question-type-help"
        id="question-type-help"
        popover="auto"
        role="note"
      >
        <SoundButton
          aria-label="Close question type explanation"
          className="question-type-help__close"
          popoverTarget="question-type-help"
          popoverTargetAction="hide"
        >
          <XIcon aria-hidden="true" weight="bold" />
        </SoundButton>
        <strong>{getQuestionTypeLabel(explainedQuestionType)}</strong>
        <p>{getQuestionTypeDescription(explainedQuestionType)}</p>
      </div>
    </>
  );
};

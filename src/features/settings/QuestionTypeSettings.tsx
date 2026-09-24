import { getQuestionTypeMultiplier } from '@/domain/quiz/score-multipliers';
import { CaretDownIcon, QuestionIcon, XIcon } from '@/components/icons';
import { SelectionTile } from './SelectionTile';
import { SoundButton } from '@/components/SoundButton';
import {
  questionDefinitions,
  questionTypeGroups,
  questionTypes,
  type QuestionTypeGroup,
} from '@/domain/quiz/questions/definitions';
import type { QuestionType } from '@/domain/quiz/types';
import { formatScoreMultiplier } from '@/domain/quiz/format';
import type { GameSettings } from '@/domain/settings/types';
import {
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import {
  toggleValue,
  type TrainingSettingsValidation,
} from './settings-validation';

interface QuestionTypeSettingsProps extends Pick<
  TrainingSettingsValidation,
  'availableQuestionTypes' | 'matchingCount' | 'questionTypesAreValid'
> {
  draft: GameSettings;
  heading: RefObject<HTMLHeadingElement | null>;
  onChange: Dispatch<SetStateAction<GameSettings>>;
  submitted: boolean;
}

const groupedQuestionTypes = questionTypeGroups.map((group) => ({
  ...group,
  types: questionTypes.filter(
    (questionType) => questionDefinitions[questionType].group === group.id,
  ),
}));

const getInitialExpandedGroup = (
  selectedQuestionTypes: readonly QuestionType[],
): QuestionTypeGroup => {
  const selected = new Set(selectedQuestionTypes);
  return (
    groupedQuestionTypes.find(
      ({ types }) =>
        types.some((questionType) => selected.has(questionType)) &&
        types.some((questionType) => !selected.has(questionType)),
    )?.id ?? questionTypeGroups[0].id
  );
};

export const QuestionTypeSettings = ({
  availableQuestionTypes,
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
  const selectedQuestionTypes = new Set(draft.questionTypes);
  const available = new Set(availableQuestionTypes);
  const allSelected =
    availableQuestionTypes.length > 0 &&
    availableQuestionTypes.every((type) => selectedQuestionTypes.has(type));
  const hasError = submitted && (!questionTypesAreValid || matchingCount === 0);

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
            disabled={availableQuestionTypes.length === 0}
            onClick={() =>
              onChange((current) => ({
                ...current,
                questionTypes: allSelected
                  ? current.questionTypes.filter((type) => !available.has(type))
                  : questionTypes.filter(
                      (type) =>
                        available.has(type) ||
                        current.questionTypes.includes(type),
                    ),
              }))
            }
            sound={allSelected ? 'toggle-off' : 'toggle-on'}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </SoundButton>
        </div>
        {hasError ? (
          <p className="form-error" id="question-types-error" role="alert">
            {selectedQuestionTypes.has('generation-roundup') &&
            draft.generations.length < 2
              ? 'Select at least two generations for Generation roundup.'
              : questionTypesAreValid
                ? 'Choose a different generation or question type combination.'
                : draft.questionTypes.length === 0
                  ? 'Choose at least one question type.'
                  : 'No questions are available for this configuration. Change your selections.'}
          </p>
        ) : null}
        {groupedQuestionTypes.map((group) => {
          const availableCount = group.types.filter((type) =>
            available.has(type),
          ).length;
          const selectedCount = group.types.filter(
            (type) => available.has(type) && selectedQuestionTypes.has(type),
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
                    {selectedCount} / {availableCount}
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
                  {group.types.map((questionType) => {
                    const label = questionDefinitions[questionType].label;
                    const factor = draft.difficulty
                      ? getQuestionTypeMultiplier(
                          questionType,
                          draft.difficulty,
                        )
                      : undefined;
                    const selectable = available.has(questionType);
                    const checked =
                      selectable && selectedQuestionTypes.has(questionType);
                    return (
                      <div
                        className={`question-type-tile${checked ? ' question-type-tile--selected' : ''}${!selectable ? ' question-type-tile--unavailable' : ''}`}
                        key={questionType}
                      >
                        <SelectionTile
                          checked={checked}
                          disabled={!selectable}
                          label={label}
                          description={
                            !selectable || factor === undefined
                              ? 'Unavailable'
                              : formatScoreMultiplier(factor)
                          }
                          onChange={(event) =>
                            onChange((current) => ({
                              ...current,
                              questionTypes: toggleValue(
                                current.questionTypes,
                                questionType,
                                event.target.checked,
                              ),
                            }))
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
        <strong>{questionDefinitions[explainedQuestionType].label}</strong>
        <p>{questionDefinitions[explainedQuestionType].description}</p>
      </div>
    </>
  );
};

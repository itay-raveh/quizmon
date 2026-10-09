import { Accordion } from '@base-ui/react/accordion';
import { Popover } from '@base-ui/react/popover';
import { getQuestionTypeMultiplier } from '@/domain/quiz/training-scoring';
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
import { isActiveQuestionType } from '@/domain/quiz/variants';
import { formatScoreMultiplier } from '@/domain/quiz/format';
import { formatQuestionUnavailableReason } from './question-availability';
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
  | 'availableQuestionTypes'
  | 'questionAvailability'
  | 'matchingCount'
  | 'questionTypesAreValid'
> {
  draft: GameSettings;
  heading: RefObject<HTMLHeadingElement | null>;
  onChange: Dispatch<SetStateAction<GameSettings>>;
  submitted: boolean;
}

const groupedQuestionTypes = questionTypeGroups
  .map((group) => ({
    ...group,
    types: questionTypes.filter(
      (questionType) =>
        isActiveQuestionType(questionType) &&
        questionDefinitions[questionType].group === group.id,
    ),
  }))
  .filter(({ types }) => types.length > 0);
const customOnlyQuestionTypes = questionTypes.filter(
  (type) => !isActiveQuestionType(type),
);

const getInitialExpandedGroup = (
  selectedQuestionTypes: readonly QuestionType[],
): QuestionTypeGroup | 'custom-only' => {
  const selected = new Set(selectedQuestionTypes);
  return (
    groupedQuestionTypes.find(
      ({ types }) =>
        types.some((questionType) => selected.has(questionType)) &&
        types.some((questionType) => !selected.has(questionType)),
    )?.id ??
    (customOnlyQuestionTypes.some((type) => selected.has(type))
      ? 'custom-only'
      : (groupedQuestionTypes[0]?.id ?? 'custom-only'))
  );
};

export const QuestionTypeSettings = ({
  availableQuestionTypes,
  questionAvailability,
  draft,
  heading,
  matchingCount,
  onChange,
  questionTypesAreValid,
  submitted,
}: QuestionTypeSettingsProps) => {
  const [explainedQuestionType, setExplainedQuestionType] =
    useState<QuestionType>('pokemonFromHistoricalSprite');
  const [initialExpandedGroup] = useState<QuestionTypeGroup | 'custom-only'>(
    () => getInitialExpandedGroup(draft.questionTypes),
  );
  const selectedQuestionTypes = new Set(draft.questionTypes);
  const available = new Set(availableQuestionTypes);
  const availableCurrent = availableQuestionTypes.filter(isActiveQuestionType);
  const allSelected =
    availableCurrent.length > 0 &&
    availableCurrent.every((type) => selectedQuestionTypes.has(type));
  const hasError = submitted && (!questionTypesAreValid || matchingCount === 0);
  const renderQuestionType = (questionType: QuestionType) => {
    const label = questionDefinitions[questionType].label;
    const factor = draft.level
      ? getQuestionTypeMultiplier(questionType, draft.level)
      : undefined;
    const selectable = available.has(questionType);
    const checked = selectable && selectedQuestionTypes.has(questionType);
    const reason = questionAvailability[questionType];
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
            reason
              ? formatQuestionUnavailableReason(reason)
              : factor === undefined
                ? undefined
                : formatScoreMultiplier(factor)
          }
          onCheckedChange={(checked) =>
            onChange((current) => ({
              ...current,
              questionTypes: toggleValue(
                current.questionTypes,
                questionType,
                checked,
              ),
            }))
          }
        />
        <Popover.Trigger
          render={<SoundButton />}
          aria-label={`About ${label}`}
          className="question-type-tile__help"
          onClick={() => setExplainedQuestionType(questionType)}
        >
          <span aria-hidden="true">
            <QuestionIcon weight="bold" />
          </span>
        </Popover.Trigger>
      </div>
    );
  };

  return (
    <Popover.Root>
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
            aria-label={`${allSelected ? 'Deselect' : 'Select'} all current question types`}
            className="selection-toggle"
            disabled={availableCurrent.length === 0}
            onClick={() =>
              onChange((current) => ({
                ...current,
                questionTypes: allSelected
                  ? current.questionTypes.filter(
                      (type) => !availableCurrent.includes(type),
                    )
                  : questionTypes.filter(
                      (type) =>
                        availableCurrent.includes(type) ||
                        current.questionTypes.includes(type),
                    ),
              }))
            }
            sound={allSelected ? 'toggle-off' : 'toggle-on'}
          >
            {allSelected ? 'Deselect current' : 'Select current'}
          </SoundButton>
        </div>
        <p className="question-type-settings__intro">
          Choose the formats for your Training rounds.
        </p>
        {hasError ? (
          <p className="form-error" id="question-types-error" role="alert">
            {selectedQuestionTypes.has('pokemonByGeneration') &&
            questionAvailability.pokemonByGeneration?.kind === 'generations'
              ? formatQuestionUnavailableReason(
                  questionAvailability.pokemonByGeneration,
                )
              : questionTypesAreValid
                ? 'Choose a different generation or question type combination.'
                : draft.questionTypes.length === 0
                  ? 'Choose at least one question type.'
                  : 'No questions are available for this configuration. Change your selections.'}
          </p>
        ) : null}
        <Accordion.Root defaultValue={[initialExpandedGroup]}>
          {groupedQuestionTypes.map((group) => {
            const availableCount = group.types.filter((type) =>
              available.has(type),
            ).length;
            const selectedCount = group.types.filter(
              (type) => available.has(type) && selectedQuestionTypes.has(type),
            ).length;
            const titleId = `question-type-group-${group.id}-title`;

            return (
              <Accordion.Item
                className="question-type-group"
                aria-labelledby={titleId}
                key={group.id}
                value={group.id}
              >
                <Accordion.Trigger
                  render={<SoundButton />}
                  className="question-type-group__disclosure"
                >
                  <h4 id={titleId}>{group.label}</h4>
                  <span className="question-type-group__count">
                    {selectedCount} / {availableCount}
                    <span className="visually-hidden"> selected</span>
                  </span>
                  <CaretDownIcon aria-hidden="true" weight="bold" />
                </Accordion.Trigger>
                <Accordion.Panel
                  keepMounted
                  className="question-type-group__panel"
                >
                  <div
                    aria-label={`${group.label} question types`}
                    className="selection-grid selection-grid--question-types"
                    role="group"
                  >
                    {group.types.map(renderQuestionType)}
                  </div>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
          {customOnlyQuestionTypes.length ? (
            <Accordion.Item
              className="question-type-group"
              aria-labelledby="question-type-group-custom-only-title"
              value="custom-only"
            >
              <Accordion.Trigger
                render={<SoundButton />}
                className="question-type-group__disclosure"
              >
                <h4 id="question-type-group-custom-only-title">Custom only</h4>
                <span className="question-type-group__count">
                  {
                    customOnlyQuestionTypes.filter(
                      (type) =>
                        available.has(type) && selectedQuestionTypes.has(type),
                    ).length
                  }{' '}
                  /{' '}
                  {
                    customOnlyQuestionTypes.filter((type) =>
                      available.has(type),
                    ).length
                  }
                  <span className="visually-hidden"> selected</span>
                </span>
                <CaretDownIcon aria-hidden="true" weight="bold" />
              </Accordion.Trigger>
              <Accordion.Panel
                keepMounted
                className="question-type-group__panel"
              >
                <p className="question-type-settings__note">
                  These formats do not appear in automatic games. They score
                  normally when selected here.
                </p>
                <div
                  aria-label="Custom only question types"
                  className="selection-grid selection-grid--question-types"
                  role="group"
                >
                  {customOnlyQuestionTypes.map(renderQuestionType)}
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          ) : null}
        </Accordion.Root>
      </section>

      <Popover.Portal>
        <Popover.Positioner className="help-positioner" sideOffset={8}>
          <Popover.Popup
            className="question-type-help"
            aria-label="Question type explanation"
          >
            <Popover.Close
              render={<SoundButton />}
              aria-label="Close question type explanation"
              className="question-type-help__close"
            >
              <XIcon aria-hidden="true" weight="bold" />
            </Popover.Close>
            <strong>{questionDefinitions[explainedQuestionType].label}</strong>
            <p>{questionDefinitions[explainedQuestionType].description}</p>
            {questionAvailability[explainedQuestionType] ? (
              <p>
                {formatQuestionUnavailableReason(
                  questionAvailability[explainedQuestionType],
                )}
              </p>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};

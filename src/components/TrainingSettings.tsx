import type { Dispatch, RefObject, SetStateAction } from 'react';
import { generations, type Generation, type Modifiers } from '@/game/types';
import { QuestionTypeSettings } from './QuestionTypeSettings';
import { SelectionTile } from './SelectionTile';
import { roundLengths } from './trainingSettingsModel';

interface TrainingSettingsValidation {
  generationsAreValid: boolean;
  matchingCount: number;
  questionTypesAreValid: boolean;
}

interface TrainingSettingsProps extends TrainingSettingsValidation {
  draft: Modifiers;
  generationsHeading: RefObject<HTMLHeadingElement | null>;
  onChange: Dispatch<SetStateAction<Modifiers>>;
  questionTypesHeading: RefObject<HTMLHeadingElement | null>;
  submitted: boolean;
  trainingChangesApplyNextGame: boolean;
}

const toggleValue = <T,>(values: readonly T[], value: T, checked: boolean) =>
  checked ? [...values, value] : values.filter((current) => current !== value);

export const TrainingSettings = ({
  draft,
  generationsAreValid,
  generationsHeading,
  matchingCount,
  onChange,
  questionTypesAreValid,
  questionTypesHeading,
  submitted,
  trainingChangesApplyNextGame,
}: TrainingSettingsProps) => {
  const allGenerationsSelected =
    draft.generations.length === generations.length;

  return (
    <>
      {trainingChangesApplyNextGame ? (
        <p className="settings-note">
          Training changes apply to your next game.
        </p>
      ) : null}

      <section className="settings-section">
        <div className="settings-section__heading">
          <h3 id="generations-title" ref={generationsHeading} tabIndex={-1}>
            Generations
          </h3>
          <button
            aria-label={`${allGenerationsSelected ? 'Deselect' : 'Select'} all generations`}
            className="selection-toggle"
            onClick={() =>
              onChange((current) => ({
                ...current,
                generations: allGenerationsSelected ? [] : [...generations],
              }))
            }
            type="button"
          >
            {allGenerationsSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div
          aria-describedby={
            submitted && !generationsAreValid ? 'generations-error' : undefined
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
                onChange((current) => ({
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
                onChange((current) => ({ ...current, limit: value }));
              }}
              variant="round-length"
            />
          ))}
        </div>
      </fieldset>

      <QuestionTypeSettings
        draft={draft}
        heading={questionTypesHeading}
        matchingCount={matchingCount}
        onChange={onChange}
        questionTypesAreValid={questionTypesAreValid}
        submitted={submitted}
      />
    </>
  );
};

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { isLeagueTraining, TRAINING_QUESTION_COUNT } from '@/game/game';
import {
  generations,
  type Generation,
  type Modifiers,
  type TrainingMode,
} from '@/game/types';
import { QuestionTypeSettings } from './QuestionTypeSettings';
import { SelectionTile } from './SelectionTile';
import { SoundButton } from './SoundButton';

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

const trainingModes: readonly TrainingMode[] = ['league', 'custom'];

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
  const leagueTraining = isLeagueTraining(draft);

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
          <SoundButton
            aria-label={`${allGenerationsSelected ? 'Deselect' : 'Select'} all generations`}
            className="selection-toggle"
            onClick={() =>
              onChange((current) => ({
                ...current,
                generations: allGenerationsSelected ? [] : [...generations],
              }))
            }
            sound={allGenerationsSelected ? 'toggle-off' : 'toggle-on'}
          >
            {allGenerationsSelected ? 'Deselect all' : 'Select all'}
          </SoundButton>
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
        <p
          aria-live="polite"
          className="training-settings__description"
          id="training-mode-description"
        >
          {leagueTraining
            ? `${TRAINING_QUESTION_COUNT} questions with every question type. Quick Attack and Perfect Form can be earned.`
            : `${TRAINING_QUESTION_COUNT} questions using the question types you choose.`}
        </p>
      </section>

      <fieldset
        aria-describedby="training-mode-description"
        className="training-mode-settings"
      >
        <legend>Training mode</legend>
        <div className="training-mode-control">
          {trainingModes.map((mode) => (
            <SelectionTile
              checked={draft.trainingMode === mode}
              inputType="radio"
              key={mode}
              label={mode === 'league' ? 'League' : 'Custom'}
              name="training-mode"
              onChange={(event) => {
                if (!event.target.checked) return;
                onChange((current) => ({
                  ...current,
                  trainingMode: mode,
                }));
              }}
              variant="training-mode"
            />
          ))}
        </div>
      </fieldset>

      {leagueTraining ? null : (
        <QuestionTypeSettings
          draft={draft}
          heading={questionTypesHeading}
          matchingCount={matchingCount}
          onChange={onChange}
          questionTypesAreValid={questionTypesAreValid}
          submitted={submitted}
        />
      )}
    </>
  );
};

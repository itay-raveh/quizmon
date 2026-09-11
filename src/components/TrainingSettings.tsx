import { GenerationLabel } from './GenerationLabel';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { isLeagueTraining } from '@/game/modifiers';
import {
  formGroups,
  generations,
  type Modifiers,
  trainingModes,
} from '@/game/types';
import { QuestionTypeSettings } from './QuestionTypeSettings';
import { SelectionTile } from './SelectionTile';
import { SoundButton } from './SoundButton';

import {
  toggleValue,
  type TrainingSettingsValidation,
} from './trainingSettingsModel';

interface TrainingSettingsProps extends Omit<
  TrainingSettingsValidation,
  'isValid'
> {
  draft: Modifiers;
  formGroupsHeading: RefObject<HTMLHeadingElement | null>;
  generationsHeading: RefObject<HTMLHeadingElement | null>;
  onChange: Dispatch<SetStateAction<Modifiers>>;
  questionTypesHeading: RefObject<HTMLHeadingElement | null>;
  submitted: boolean;
  trainingChangesApplyNextGame: boolean;
}

export const TrainingSettings = ({
  draft,
  availableFormGroups,
  formGroupGenerations,
  formGroupsAreValid,
  formGroupsHeading,
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
  const hasGenerationError = submitted && !generationsAreValid;

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
            hasGenerationError ? 'generations-error' : undefined
          }
          aria-invalid={hasGenerationError}
          aria-labelledby="generations-title"
          className="selection-grid selection-grid--generations"
          role="group"
        >
          {generations.map((generation) => (
            <SelectionTile
              checked={draft.generations.includes(generation)}
              key={generation}
              label={
                <GenerationLabel generation={generation} variant="numeral" />
              }
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  generations: toggleValue(
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
        {hasGenerationError ? (
          <p className="form-error" id="generations-error" role="alert">
            Choose at least one generation.
          </p>
        ) : null}
      </section>

      <section className="settings-section">
        <div className="settings-section__heading">
          <h3 id="form-groups-title" ref={formGroupsHeading} tabIndex={-1}>
            Forms
          </h3>
        </div>
        <div
          className="selection-grid selection-grid--forms"
          role="group"
          aria-labelledby="form-groups-title"
          aria-invalid={submitted && !formGroupsAreValid}
          aria-describedby={
            submitted && !formGroupsAreValid ? 'form-groups-error' : undefined
          }
        >
          {formGroups.map((group) => {
            const available = availableFormGroups.includes(group);
            const labels = {
              standard: 'Standard',
              regional: 'Regional',
              mega: 'Mega',
              gigantamax: 'Gigantamax',
            };
            return (
              <SelectionTile
                key={group}
                variant="form"
                label={labels[group]}
                checked={available && draft.formGroups.includes(group)}
                disabled={!available}
                description={
                  !available
                    ? group === 'standard'
                      ? 'Select a generation.'
                      : `Needs Gen ${formGroupGenerations[group].join(' or ')}.`
                    : group === 'standard'
                      ? 'Includes alternate forms.'
                      : undefined
                }
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    formGroups: toggleValue(
                      current.formGroups ?? formGroups,
                      group,
                      event.target.checked,
                    ),
                  }))
                }
              />
            );
          })}
        </div>
        {submitted && !formGroupsAreValid ? (
          <p className="form-error" id="form-groups-error" role="alert">
            Choose at least one available form group.
          </p>
        ) : null}
      </section>

      <fieldset className="training-mode-settings">
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
          submitted={submitted && generationsAreValid && formGroupsAreValid}
        />
      )}
    </>
  );
};

import { Fieldset } from '@base-ui/react/fieldset';
import { RadioGroup } from '@base-ui/react/radio-group';
import { useInteractionSound } from '@/lib/audio/sound-context';
import { GenerationLabel } from '@/components/GenerationLabel';
import { LevelNumber } from '@/components/LevelLabel';
import { SelectionTile } from './SelectionTile';
import { SoundButton } from '@/components/SoundButton';
import { formGroups, generations } from '@/domain/pokemon/types';
import { gameLevels } from '@/domain/quiz/level';
import { type GameSettings } from '@/domain/settings/types';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { QuestionTypeSettings } from './QuestionTypeSettings';

import {
  toggleValue,
  type TrainingSettingsValidation,
} from './settings-validation';

interface TrainingSettingsProps extends Omit<
  TrainingSettingsValidation,
  'isValid'
> {
  section: 'level' | 'generations' | 'training';
  draft: GameSettings;
  formGroupsHeading: RefObject<HTMLHeadingElement | null>;
  generationsHeading: RefObject<HTMLHeadingElement | null>;
  onChange: Dispatch<SetStateAction<GameSettings>>;
  questionTypesHeading: RefObject<HTMLHeadingElement | null>;
  submitted: boolean;
  trainingChangesApplyNextGame: boolean;
}

export const TrainingSettings = ({
  section,
  draft,
  availableFormGroups,
  availableQuestionTypes,
  questionAvailability,
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
  const play = useInteractionSound();
  const allGenerationsSelected =
    draft.generations.length === generations.length;
  const customized = draft.questionSelection === 'custom';
  const hasGenerationError = submitted && !generationsAreValid;

  return (
    <>
      {trainingChangesApplyNextGame ? (
        <p className="settings-note">
          Training changes apply to your next game.
        </p>
      ) : null}

      {section === 'level' && (
        <Fieldset.Root className="level-settings">
          <Fieldset.Legend render={<legend />}>Level</Fieldset.Legend>
          <RadioGroup
            className="level-control"
            name="level"
            aria-label="Level"
            value={draft.level}
            onValueChange={(level) => {
              play('toggle-on');
              onChange((current) => ({ ...current, level }));
            }}
          >
            {gameLevels.map((level) => (
              <SelectionTile
                key={level}
                value={level}
                inputType="radio"
                variant="training-mode"
                label={
                  <>
                    <span className="visually-hidden">{`Level ${level}`}</span>
                    <span aria-hidden="true">
                      <LevelNumber level={level} />
                    </span>
                  </>
                }
              />
            ))}
          </RadioGroup>
        </Fieldset.Root>
      )}

      {section === 'generations' && (
        <>
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
                    <GenerationLabel
                      generation={generation}
                      variant="numeral"
                    />
                  }
                  onCheckedChange={(checked) =>
                    onChange((current) => ({
                      ...current,
                      generations: toggleValue(
                        current.generations,
                        generation,
                        checked,
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
                submitted && !formGroupsAreValid
                  ? 'form-groups-error'
                  : undefined
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
                        : undefined
                    }
                    onCheckedChange={(checked) =>
                      onChange((current) => ({
                        ...current,
                        formGroups: toggleValue(
                          current.formGroups,
                          group,
                          checked,
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
        </>
      )}

      {section === 'training' && (
        <>
          <section className="settings-section">
            <SelectionTile
              checked={customized}
              label="Customize questions"
              onCheckedChange={(checked) =>
                onChange((current) => ({
                  ...current,
                  questionSelection: checked ? 'custom' : 'automatic',
                }))
              }
            />
            {customized ? (
              <p className="settings-note" role="status">
                Custom Training rounds use the same scoring and rankings as
                automatic rounds.
              </p>
            ) : null}
          </section>

          {!customized ? null : (
            <QuestionTypeSettings
              availableQuestionTypes={availableQuestionTypes}
              questionAvailability={questionAvailability}
              draft={draft}
              heading={questionTypesHeading}
              matchingCount={matchingCount}
              onChange={onChange}
              questionTypesAreValid={questionTypesAreValid}
              submitted={submitted && generationsAreValid && formGroupsAreValid}
            />
          )}
        </>
      )}
    </>
  );
};

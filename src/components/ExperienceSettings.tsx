import type { Dispatch, SetStateAction } from 'react';
import type { AnswerFlow, Modifiers, TimerDisplay } from '@/game/types';
import { Checkbox } from './Checkbox';
import { DailyReminderSetting } from './DailyReminderSetting';
import { SelectionTile } from './SelectionTile';

interface ExperienceSettingsProps {
  draft: Modifiers;
  onChange: Dispatch<SetStateAction<Modifiers>>;
}

const answerFlows: readonly {
  description: string;
  label: string;
  value: AnswerFlow;
}[] = [
  { description: 'Use the Next button', label: 'Manual', value: 'manual' },
  { description: 'Move on after 2 seconds', label: 'Auto', value: 'auto' },
  {
    description: 'Move on after 0.3 seconds',
    label: 'Instant',
    value: 'instant',
  },
];

const timerDisplays: readonly { label: string; value: TimerDisplay }[] = [
  { label: 'Hidden', value: 'hidden' },
  { label: 'Seconds', value: 'seconds' },
  { label: 'Milliseconds', value: 'milliseconds' },
];

export const ExperienceSettings = ({
  draft,
  onChange,
}: ExperienceSettingsProps) => {
  const volumePercent = Math.round(draft.soundVolume * 100);

  return (
    <div className="experience-settings">
      <fieldset className="experience-setting">
        <legend>Answer flow</legend>
        <div className="experience-options experience-options--flow">
          {answerFlows.map(({ description, label, value }) => (
            <SelectionTile
              checked={draft.answerFlow === value}
              description={description}
              inputType="radio"
              key={value}
              label={label}
              name="answer-flow"
              onChange={(event) => {
                if (!event.target.checked) return;
                onChange((current) => ({ ...current, answerFlow: value }));
              }}
              variant="experience"
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="experience-setting">
        <legend>Timer</legend>
        <div className="experience-options experience-options--timer">
          {timerDisplays.map(({ label, value }) => (
            <SelectionTile
              checked={draft.timerDisplay === value}
              inputType="radio"
              key={value}
              label={label}
              name="timer-display"
              onChange={(event) => {
                if (!event.target.checked) return;
                onChange((current) => ({ ...current, timerDisplay: value }));
              }}
              variant="experience"
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="experience-setting">
        <legend>Sound</legend>
        <label className="volume-control">
          <span>Sound effects</span>
          <output>{volumePercent}%</output>
          <input
            aria-label="Sound effects"
            aria-valuetext={`${volumePercent}%`}
            max="1"
            min="0"
            onChange={(event) => {
              const soundVolume = Number(event.target.value);
              onChange((current) => ({ ...current, soundVolume }));
            }}
            step="0.1"
            type="range"
            value={draft.soundVolume}
          />
        </label>
      </fieldset>

      <fieldset className="experience-setting">
        <legend>Motion</legend>
        <Checkbox
          checked={draft.reduceMotion}
          description="Minimize non-essential animation. Device preferences are always respected."
          label="Reduce motion"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              reduceMotion: event.target.checked,
            }))
          }
        />
      </fieldset>

      <fieldset className="experience-setting">
        <legend>Daily reminder</legend>
        <DailyReminderSetting />
      </fieldset>
    </div>
  );
};

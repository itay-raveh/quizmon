import type { Dispatch, SetStateAction } from 'react';
import {
  answerFlows,
  answerFlowDelays,
  timerDisplays,
  type AnswerFlow,
  type Modifiers,
  type TimerDisplay,
} from '@/game/types';
import { Checkbox } from './Checkbox';
import { DailyReminderSetting } from './DailyReminderSetting';
import { SelectionTile } from './SelectionTile';

interface ExperienceSettingsProps {
  draft: Modifiers;
  onChange: Dispatch<SetStateAction<Modifiers>>;
}

const answerFlowLabels: Record<AnswerFlow, string> = {
  manual: 'Manual',
  auto: 'Auto',
  instant: 'Instant',
};

const timerDisplayLabels: Record<TimerDisplay, string> = {
  hidden: 'Hidden',
  seconds: 'Seconds',
  milliseconds: 'Milliseconds',
};

export const ExperienceSettings = ({
  draft,
  onChange,
}: ExperienceSettingsProps) => {
  const volumePercent = Math.round(draft.soundVolume * 100);

  return (
    <div className="experience-settings">
      <fieldset className="experience-setting">
        <legend>Daily Challenge Reminder</legend>
        <DailyReminderSetting />
      </fieldset>

      <fieldset className="experience-setting">
        <legend>Answer flow</legend>
        <div className="experience-options experience-options--flow">
          {answerFlows.map((value) => (
            <SelectionTile
              checked={draft.answerFlow === value}
              description={
                value === 'manual'
                  ? 'Use the Next button'
                  : `Move on after ${answerFlowDelays[value] / 1_000} seconds`
              }
              inputType="radio"
              key={value}
              label={answerFlowLabels[value]}
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
          {timerDisplays.map((value) => (
            <SelectionTile
              checked={draft.timerDisplay === value}
              inputType="radio"
              key={value}
              label={timerDisplayLabels[value]}
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
    </div>
  );
};

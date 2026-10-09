import { Fieldset } from '@base-ui/react/fieldset';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Slider } from '@base-ui/react/slider';
import { useInteractionSound } from '@/lib/audio/sound-context';
import { SelectionTile } from './SelectionTile';
import {
  answerFlowDelays,
  answerFlows,
  timerDisplays,
  type AnswerFlow,
  type GameSettings,
  type TimerDisplay,
} from '@/domain/settings/types';
import { InstallSetting } from '@/features/installation/InstallSetting';
import { DailyReminderSetting } from '@/features/reminders/DailyReminderSetting';
import { useDailyReminder } from '@/features/reminders/daily-reminder-context';
import type { Dispatch, SetStateAction } from 'react';

interface ExperienceSettingsProps {
  draft: GameSettings;
  onChange: Dispatch<SetStateAction<GameSettings>>;
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
  const play = useInteractionSound();
  const volumePercent = Math.round(draft.soundVolume * 100);
  const installForReminders = useDailyReminder().status === 'install-required';

  return (
    <div className="experience-settings">
      <Fieldset.Root className="experience-setting">
        <Fieldset.Legend render={<legend />}>
          Daily Challenge reminder
        </Fieldset.Legend>
        <DailyReminderSetting />
      </Fieldset.Root>
      {installForReminders && <InstallSetting />}
      <Fieldset.Root className="experience-setting">
        <Fieldset.Legend render={<legend />}>Answer flow</Fieldset.Legend>
        <RadioGroup
          className="experience-options experience-options--flow"
          name="flow"
          aria-label="Answer flow"
          value={draft.answerFlow}
          onValueChange={(value) => {
            play('toggle-on');
            onChange((current) => ({ ...current, answerFlow: value }));
          }}
        >
          {answerFlows.map((value) => (
            <SelectionTile
              value={value}
              description={
                value === 'manual'
                  ? 'Use the Next button'
                  : `Move on after ${answerFlowDelays[value] / 1_000} seconds`
              }
              inputType="radio"
              key={value}
              label={answerFlowLabels[value]}
              variant="experience"
            />
          ))}
        </RadioGroup>
      </Fieldset.Root>

      <Fieldset.Root className="experience-setting">
        <Fieldset.Legend render={<legend />}>Sound</Fieldset.Legend>
        <div className="volume-control">
          <span>Sound effects</span>
          <output>{volumePercent}%</output>
          <Slider.Root
            className="volume-slider"
            min={0}
            max={1}
            step={0.1}
            value={draft.soundVolume}
            onValueChange={(soundVolume) =>
              onChange((current) => ({ ...current, soundVolume }))
            }
          >
            <Slider.Control className="volume-slider__control">
              <Slider.Track className="volume-slider__track">
                <Slider.Indicator className="volume-slider__indicator" />
              </Slider.Track>
              <Slider.Thumb
                className="volume-slider__thumb"
                aria-label="Sound effects"
                getAriaValueText={(_, value) => `${Math.round(value * 100)}%`}
              />
            </Slider.Control>
          </Slider.Root>
        </div>
      </Fieldset.Root>

      <Fieldset.Root className="experience-setting">
        <Fieldset.Legend render={<legend />}>Timer</Fieldset.Legend>
        <RadioGroup
          className="experience-options experience-options--timer"
          name="timer"
          aria-label="Timer"
          value={draft.timerDisplay}
          onValueChange={(value) => {
            play('toggle-on');
            onChange((current) => ({ ...current, timerDisplay: value }));
          }}
        >
          {timerDisplays.map((value) => (
            <SelectionTile
              value={value}
              inputType="radio"
              key={value}
              label={timerDisplayLabels[value]}
              variant="experience"
            />
          ))}
        </RadioGroup>
      </Fieldset.Root>
      {!installForReminders && <InstallSetting />}
    </div>
  );
};

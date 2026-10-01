import * as styles from '../../styles/classes.css.ts';
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
  const volumePercent = Math.round(draft.soundVolume * 100);
  const installForReminders = useDailyReminder().status === 'install-required';

  return (
    <div className={styles.experienceSettings}>
      <fieldset className={styles.experienceSetting}>
        <legend>Daily Challenge reminder</legend>
        <DailyReminderSetting />
      </fieldset>
      {installForReminders && <InstallSetting />}
      <fieldset className={styles.experienceSetting}>
        <legend>Answer flow</legend>
        <div className={`${styles.experienceOptions} experience-options--flow`}>
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

      <fieldset className={styles.experienceSetting}>
        <legend>Sound</legend>
        <label className={styles.volumeControl}>
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

      <fieldset className={styles.experienceSetting}>
        <legend>Timer</legend>
        <div
          className={`${styles.experienceOptions} ${styles.experienceOptionsTimer}`}
        >
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
      {!installForReminders && <InstallSetting />}
    </div>
  );
};

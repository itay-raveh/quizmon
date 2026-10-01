import * as styles from '../../styles/classes.css.ts';
import { Checkbox } from '@/components/Checkbox';
import { useDailyReminder } from '@/features/reminders/daily-reminder-context';

export const DailyReminderSetting = () => {
  const { busy, disable, enable, error, time, setTime, status } =
    useDailyReminder();

  if (status === 'unsupported') {
    return (
      <p className={styles.experienceStatus}>Not available in this browser.</p>
    );
  }
  if (status === 'install-required') {
    return (
      <p className={styles.experienceStatus}>
        Install Quizmon, then open it from your Home Screen to turn on
        reminders.
      </p>
    );
  }
  if (status === 'blocked') {
    return (
      <p className={styles.experienceStatus}>
        Notifications are blocked. Allow them in your browser settings to turn
        this on.
      </p>
    );
  }

  return (
    <>
      <Checkbox
        checked={status === 'enabled'}
        disabled={busy || status === 'checking'}
        label="Remind me each day"
        onChange={(event) => void (event.target.checked ? enable() : disable())}
      />
      <label className={styles.reminderTimeControl}>
        <span>Time</span>
        <input
          aria-describedby="reminder-time-hint"
          disabled={status === 'checking' || (busy && status !== 'enabled')}
          onChange={(event) => void setTime(event.target.value)}
          type="time"
          value={time}
        />
      </label>
      <p className={styles.experienceStatus} id="reminder-time-hint">
        Local time · saves automatically
      </p>
      {error ? (
        <p
          className={`${styles.experienceStatus} ${styles.experienceStatusError}`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </>
  );
};

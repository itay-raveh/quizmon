import { Checkbox } from '@/components/Checkbox';
import { useDailyReminder } from '@/features/reminders/daily-reminder-context';
import { formatReminderHour } from '@/features/reminders/reminder-config';

export const DailyReminderSetting = () => {
  const { busy, disable, enable, error, hour, setHour, status } =
    useDailyReminder();

  if (status === 'unsupported') {
    return <p className="experience-status">Not available in this browser.</p>;
  }
  if (status === 'install-required') {
    return (
      <p className="experience-status">
        Install Quizmon, then open it from your Home Screen to turn on
        reminders.
      </p>
    );
  }
  if (status === 'blocked') {
    return (
      <p className="experience-status">
        Notifications are blocked. Allow them in your browser settings to turn
        this on.
      </p>
    );
  }

  return (
    <>
      <Checkbox
        checked={status === 'enabled'}
        description="Saves immediately."
        disabled={busy || status === 'checking'}
        label="Daily reminder"
        onChange={(event) => void (event.target.checked ? enable() : disable())}
      />
      <label className="reminder-time-control">
        <span>Reminder time</span>
        <select
          disabled={busy || status === 'checking'}
          onChange={(event) => void setHour(Number(event.target.value))}
          value={hour}
        >
          {Array.from({ length: 24 }, (_, value) => (
            <option key={value} value={value}>
              {formatReminderHour(value)}
            </option>
          ))}
        </select>
      </label>
      <p className="experience-status">Uses this device’s time zone.</p>
      {error ? (
        <p className="experience-status experience-status--error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
};

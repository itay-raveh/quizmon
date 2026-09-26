import { Checkbox } from '@/components/Checkbox';
import { useDailyReminder } from '@/features/reminders/daily-reminder-context';

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
        <input
          disabled={busy || status === 'checking'}
          min="00:00"
          onChange={(event) => {
            if (!/^\d{2}:00$/.test(event.target.value)) return;
            void setHour(Number(event.target.value.slice(0, 2)));
          }}
          step="3600"
          type="time"
          value={`${String(hour).padStart(2, '0')}:00`}
        />
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

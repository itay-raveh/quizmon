import { Checkbox } from '@/components/Checkbox';
import { useDailyReminder } from '@/features/reminders/daily-reminder-context';

export const DailyReminderSetting = () => {
  const { busy, disable, enable, error, status } = useDailyReminder();

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
        disabled={busy || status === 'checking'}
        label="Remind me each morning"
        onChange={(event) => void (event.target.checked ? enable() : disable())}
      />
      {error ? (
        <p className="experience-status experience-status--error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
};

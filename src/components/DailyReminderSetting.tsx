import { useDailyReminder } from '@/notifications/daily-reminder-context';
import { Checkbox } from './Checkbox';

export const DailyReminderSetting = () => {
  const { busy, disable, enable, error, status } = useDailyReminder();

  if (status === 'unsupported') {
    return <p className="experience-status">Not available in this browser.</p>;
  }
  if (status === 'install-required') {
    return (
      <p className="experience-status">
        Add Quizmon to your Home Screen, then open it there to turn this on.
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
        description="When the next Daily is ready."
        disabled={busy || status === 'checking'}
        label="Remind me at 8:00 AM"
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

export const VAPID_PUBLIC_KEY =
  'BC755gsK5_FLrrQNSwrJ_bVYGP7OzckRJQmiix_BCtirLY6bzp-fOADOtE0iS4lIh-vXzryptGx5_hSpHGpkUJ4';

export const DAILY_REMINDER_MESSAGE = {
  body: 'Five questions are waiting.',
  tag: 'quizmon-daily',
  title: "Today's Daily is ready",
};

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

export const formatReminderTime = (time: string) =>
  timeFormatter.format(
    new Date(
      Date.UTC(2020, 0, 1, Number(time.slice(0, 2)), Number(time.slice(3, 5))),
    ),
  );

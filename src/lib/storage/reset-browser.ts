import { isUuid } from '../validation';

export const discardOldBrowserData = async (): Promise<void> => {
  const oldReminderId = localStorage.getItem(
    'quizmon.daily-reminder-subscription.v1',
  );

  for (const storage of [localStorage, sessionStorage])
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);
      if (key?.startsWith('quizmon.') && !key.startsWith('quizmon.baseline.'))
        storage.removeItem(key);
    }

  if (isUuid(oldReminderId))
    void fetch(`/api/daily-reminders/${oldReminderId}`, {
      method: 'DELETE',
    }).catch(() => undefined);

  if (oldReminderId)
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
    } catch {
      // Old server registrations are cleared by their next alarm.
    }
};

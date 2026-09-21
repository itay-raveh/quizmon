import { isUuid } from '../validation';

const oldDatabase = /^quizmon-(?:guest|account)-.*\.sqlite$/;

export const discardOldBrowserData = async (): Promise<void> => {
  const selectedAccount = localStorage.getItem('quizmon.account.v1');
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

  const known = [
    'quizmon-guest-v2.sqlite',
    ...(selectedAccount
      ? [`quizmon-account-${encodeURIComponent(selectedAccount)}-v2.sqlite`]
      : []),
  ];
  const discovered = await indexedDB.databases?.().catch(() => []);
  const names = new Set([
    ...known,
    ...(discovered
      ?.map(({ name }) => name)
      .filter((name): name is string => Boolean(name)) ?? []),
  ]);
  await Promise.all(
    [...names]
      .filter(
        (name) => oldDatabase.test(name) && !name.includes('-baseline.sqlite'),
      )
      .map(
        (name) =>
          new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess =
              request.onerror =
              request.onblocked =
                () => resolve();
          }),
      ),
  );
};

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getUtcDate } from '../../domain/quiz/daily';
import {
  readStoredValue,
  removeStoredValue,
  writeStoredValue,
} from '../../lib/storage/browser-storage';
import { readDailyState } from '../daily/daily-state';
import { isIos, isStandalone } from '../installation/install-platform';
import {
  DailyReminderContext,
  type DailyReminderStatus,
} from './daily-reminder-context';
import { VAPID_PUBLIC_KEY } from './reminder-config';

const SUBSCRIPTION_ID_KEY = 'quizmon.baseline.daily-reminder-subscription';
const REMINDER_HOUR_KEY = 'quizmon.baseline.daily-reminder-hour';

const readReminderHour = (): number => {
  const value = readStoredValue('localStorage', REMINDER_HOUR_KEY);
  return value !== null && /^(?:[0-9]|1[0-9]|2[0-3])$/.test(value)
    ? Number(value)
    : 8;
};

const supportsPush = () =>
  'Notification' in window &&
  'PushManager' in window &&
  'serviceWorker' in navigator;

const getInitialStatus = (): DailyReminderStatus => {
  if (isIos() && !isStandalone()) return 'install-required';
  if (!supportsPush()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' ? 'checking' : 'available';
};

const getSubscriptionId = (): string => {
  const stored = readStoredValue('localStorage', SUBSCRIPTION_ID_KEY);
  if (stored) return stored;

  const id = crypto.randomUUID();
  if (!writeStoredValue('localStorage', SUBSCRIPTION_ID_KEY, id))
    throw new Error('The reminder ID could not be saved.');
  return id;
};

const registerSubscription = async (
  id: string,
  subscription: PushSubscription,
  hour: number,
) => {
  const today = getUtcDate();
  const response = await fetch(`/api/daily-reminders/${id}`, {
    body: JSON.stringify({
      completedDate:
        readDailyState(today).completed.length > 0 ? today : undefined,
      subscription: subscription.toJSON(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      hour,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });

  if (!response.ok) throw new Error('The reminder could not be saved.');
};

export const DailyReminderProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [status, setStatus] = useState<DailyReminderStatus>(getInitialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hour, setHourState] = useState(readReminderHour);

  useEffect(() => {
    if (status !== 'checking') return;

    let active = true;
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) => {
        if (!active) return;
        if (!subscription) {
          setStatus('available');
          return;
        }

        await registerSubscription(getSubscriptionId(), subscription, hour);
        if (active) setStatus('enabled');
      })
      .catch(() => {
        if (!active) return;
        setError('The reminder could not be checked. Try again.');
        setStatus('available');
      });

    return () => {
      active = false;
    };
  }, [hour, status]);

  const enable = useCallback(async () => {
    if (!supportsPush() || status === 'install-required') return;

    setBusy(true);
    setError(null);
    try {
      const permission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'blocked' : 'available');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          applicationServerKey: VAPID_PUBLIC_KEY,
          userVisibleOnly: true,
        }));
      await registerSubscription(getSubscriptionId(), subscription, hour);
      setStatus('enabled');
    } catch {
      setError('The reminder could not be turned on. Try again.');
      setStatus('available');
    } finally {
      setBusy(false);
    }
  }, [hour, status]);

  const setHour = useCallback(
    async (nextHour: number) => {
      if (!Number.isInteger(nextHour) || nextHour < 0 || nextHour > 23) return;
      setBusy(true);
      setError(null);
      try {
        if (
          !writeStoredValue('localStorage', REMINDER_HOUR_KEY, String(nextHour))
        )
          throw new Error('The reminder time could not be saved.');
        if (status === 'enabled') {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (!subscription) throw new Error('The reminder is unavailable.');
          await registerSubscription(
            getSubscriptionId(),
            subscription,
            nextHour,
          );
        }
        setHourState(nextHour);
      } catch {
        writeStoredValue('localStorage', REMINDER_HOUR_KEY, String(hour));
        setError('The reminder time could not be saved. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [hour, status],
  );

  const disable = useCallback(async () => {
    if (!supportsPush()) return;

    setBusy(true);
    setError(null);
    try {
      const id = readStoredValue('localStorage', SUBSCRIPTION_ID_KEY);
      if (id) {
        const response = await fetch(`/api/daily-reminders/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok && response.status !== 404) {
          throw new Error('The reminder could not be removed.');
        }
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe();
      removeStoredValue('localStorage', SUBSCRIPTION_ID_KEY);
      setStatus('available');
    } catch {
      setError('The reminder could not be turned off. Try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  const recordDailyCompletion = useCallback((date: string) => {
    const id = readStoredValue('localStorage', SUBSCRIPTION_ID_KEY);
    if (!id) return;

    void fetch(`/api/daily-reminders/${id}`, {
      body: JSON.stringify({ completedDate: date }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    }).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      busy,
      disable,
      enable,
      error,
      hour,
      recordDailyCompletion,
      setHour,
      status,
    }),
    [
      busy,
      disable,
      enable,
      error,
      hour,
      recordDailyCompletion,
      setHour,
      status,
    ],
  );

  return <DailyReminderContext value={value}>{children}</DailyReminderContext>;
};

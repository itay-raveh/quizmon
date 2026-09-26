import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
// Keep the original key so existing device preferences survive the change.
const REMINDER_TIME_KEY = 'quizmon.baseline.daily-reminder-hour';
const reminderTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const readReminderTime = (): string => {
  const value = readStoredValue('localStorage', REMINDER_TIME_KEY);
  if (value && reminderTimePattern.test(value)) return value;
  if (value && /^(?:[0-9]|1[0-9]|2[0-3])$/.test(value)) {
    return `${value.padStart(2, '0')}:00`;
  }
  return '08:00';
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
  time: string,
) => {
  const today = getUtcDate();
  const response = await fetch(`/api/daily-reminders/${id}`, {
    body: JSON.stringify({
      completedDate:
        readDailyState(today).completed.length > 0 ? today : undefined,
      subscription: subscription.toJSON(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      hour: Number(time.slice(0, 2)),
      minute: Number(time.slice(3, 5)),
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
  const [time, setTimeState] = useState(readReminderTime);
  const latestTime = useRef(time);
  const syncedTime = useRef(time);
  const pendingTimeSaves = useRef(0);
  const timeSaveQueue = useRef(Promise.resolve());

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

        await registerSubscription(getSubscriptionId(), subscription, time);
        syncedTime.current = time;
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
  }, [time, status]);

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
      await registerSubscription(getSubscriptionId(), subscription, time);
      syncedTime.current = time;
      setStatus('enabled');
    } catch {
      setError('The reminder could not be turned on. Try again.');
      setStatus('available');
    } finally {
      setBusy(false);
    }
  }, [time, status]);

  const setTime = useCallback(
    async (nextTime: string) => {
      if (!reminderTimePattern.test(nextTime)) return;
      if (!writeStoredValue('localStorage', REMINDER_TIME_KEY, nextTime)) {
        setError('The reminder time could not be saved. Try again.');
        return;
      }
      latestTime.current = nextTime;
      setTimeState(nextTime);
      setError(null);
      if (status !== 'enabled') return;

      pendingTimeSaves.current += 1;
      setBusy(true);
      const save = timeSaveQueue.current
        .catch(() => undefined)
        .then(async () => {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (!subscription) throw new Error('The reminder is unavailable.');
          await registerSubscription(
            getSubscriptionId(),
            subscription,
            nextTime,
          );
          syncedTime.current = nextTime;
        });
      timeSaveQueue.current = save;
      try {
        await save;
      } catch {
        if (latestTime.current === nextTime) {
          latestTime.current = syncedTime.current;
          writeStoredValue(
            'localStorage',
            REMINDER_TIME_KEY,
            syncedTime.current,
          );
          setTimeState(syncedTime.current);
          setError('The reminder time could not be saved. Try again.');
        }
      } finally {
        pendingTimeSaves.current -= 1;
        if (pendingTimeSaves.current === 0) setBusy(false);
      }
    },
    [status],
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
      time,
      recordDailyCompletion,
      setTime,
      status,
    }),
    [
      busy,
      disable,
      enable,
      error,
      time,
      recordDailyCompletion,
      setTime,
      status,
    ],
  );

  return <DailyReminderContext value={value}>{children}</DailyReminderContext>;
};

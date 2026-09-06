import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  readStoredValue,
  removeStoredValue,
  writeStoredValue,
} from '@/game/browser-storage';
import { getLocalDate } from '@/game/daily';
import { readDailyResult } from '@/game/storage';
import { VAPID_PUBLIC_KEY } from './config';
import {
  DailyReminderContext,
  type DailyReminderStatus,
} from './daily-reminder-context';

const SUBSCRIPTION_ID_KEY = 'quizmon.daily-reminder-subscription.v1';
const LAST_COMPLETED_DAILY_KEY = 'quizmon.daily-reminder-last-completed.v1';

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches === true ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

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

const decodeApplicationServerKey = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`;
  const bytes = atob(padded.replaceAll('-', '+').replaceAll('_', '/'));
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
};

const getSubscriptionId = (): string => {
  const stored = readStoredValue('localStorage', SUBSCRIPTION_ID_KEY);
  if (stored) return stored;

  const id = crypto.randomUUID();
  writeStoredValue('localStorage', SUBSCRIPTION_ID_KEY, id);
  return id;
};

const registerSubscription = async (
  id: string,
  subscription: PushSubscription,
) => {
  const today = getLocalDate();
  const response = await fetch(`/api/daily-reminders/${id}`, {
    body: JSON.stringify({
      completedDate: readDailyResult(today)
        ? today
        : (readStoredValue('localStorage', LAST_COMPLETED_DAILY_KEY) ??
          undefined),
      subscription: subscription.toJSON(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
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

        await registerSubscription(getSubscriptionId(), subscription);
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
  }, [status]);

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
          applicationServerKey: decodeApplicationServerKey(VAPID_PUBLIC_KEY),
          userVisibleOnly: true,
        }));
      await registerSubscription(getSubscriptionId(), subscription);
      setStatus('enabled');
    } catch {
      setError('The reminder could not be turned on. Try again.');
      setStatus('available');
    } finally {
      setBusy(false);
    }
  }, [status]);

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
    writeStoredValue('localStorage', LAST_COMPLETED_DAILY_KEY, date);
    const id = readStoredValue('localStorage', SUBSCRIPTION_ID_KEY);
    if (!id) return;

    void fetch(`/api/daily-reminders/${id}`, {
      body: JSON.stringify({ completedDate: date }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    }).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ busy, disable, enable, error, recordDailyCompletion, status }),
    [busy, disable, enable, error, recordDailyCompletion, status],
  );

  return (
    <DailyReminderContext.Provider value={value}>
      {children}
    </DailyReminderContext.Provider>
  );
};

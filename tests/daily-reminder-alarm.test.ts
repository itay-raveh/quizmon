import webpush, { WebPushError } from 'web-push';
import { DailyReminder } from '../worker/daily-reminder';
import { site } from '@/app/site';
import {
  DAILY_REMINDER_MESSAGE,
  VAPID_PUBLIC_KEY,
} from '@/notifications/config';

const subscription = {
  endpoint: 'https://example.com/push',
  keys: { auth: 'test-auth', p256dh: 'test-key' },
};
const nextMorning = Date.parse('2026-09-09T08:00:00.000Z');

const makeReminder = (completedDate?: string) => {
  const storage = {
    get: vi
      .fn()
      .mockResolvedValue({ subscription, timeZone: 'UTC', completedDate }),
    deleteAll: vi.fn().mockResolvedValue(undefined),
    setAlarm: vi.fn().mockResolvedValue(undefined),
  };
  const reminder = new DailyReminder(
    { storage },
    {
      DAILY_REMINDERS: { getByName: vi.fn() },
      VAPID_PRIVATE_KEY: 'test-private-key',
    },
  );
  return { reminder, storage };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-08T08:00:00.000Z'));
  vi.spyOn(webpush, 'sendNotification').mockResolvedValue({
    statusCode: 201,
    headers: {},
    body: '',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it('does not send or rearm an alarm after a registration was removed', async () => {
  const { reminder, storage } = makeReminder();
  storage.get.mockResolvedValue(undefined);

  await reminder.alarm();

  expect(webpush.sendNotification).not.toHaveBeenCalled();
  expect(storage.setAlarm).not.toHaveBeenCalled();
});

it('skips a completed daily while keeping the next morning reminder', async () => {
  const { reminder, storage } = makeReminder('2026-09-08');

  await reminder.alarm();

  expect(webpush.sendNotification).not.toHaveBeenCalled();
  expect(storage.setAlarm).toHaveBeenCalledExactlyOnceWith(nextMorning);
  expect(storage.deleteAll).not.toHaveBeenCalled();
});

it.each([undefined, '2026-09-07'])(
  'sends an uncompleted daily and rearms the alarm (last completion: %s)',
  async (completedDate) => {
    const { reminder, storage } = makeReminder(completedDate);

    await reminder.alarm();

    expect(webpush.sendNotification).toHaveBeenCalledExactlyOnceWith(
      subscription,
      JSON.stringify({
        ...DAILY_REMINDER_MESSAGE,
        url: '/?daily=2026-09-08&play=1',
      }),
      {
        TTL: 43_200,
        topic: 'quizmon-daily',
        urgency: 'normal',
        vapidDetails: {
          privateKey: 'test-private-key',
          publicKey: VAPID_PUBLIC_KEY,
          subject: `mailto:${site.contactEmail}`,
        },
      },
    );
    expect(storage.setAlarm).toHaveBeenCalledExactlyOnceWith(nextMorning);
    expect(storage.deleteAll).not.toHaveBeenCalled();
  },
);

it.each([404, 410])(
  'removes a subscription rejected with HTTP %s',
  async (status) => {
    const { reminder, storage } = makeReminder();
    vi.mocked(webpush.sendNotification).mockRejectedValue(
      new WebPushError(
        'Subscription expired',
        status,
        {},
        '',
        subscription.endpoint,
      ),
    );

    await reminder.alarm();

    expect(storage.deleteAll).toHaveBeenCalledOnce();
    expect(storage.setAlarm).not.toHaveBeenCalled();
  },
);

it.each([
  new WebPushError('Service unavailable', 503, {}, '', subscription.endpoint),
  new Error('Network unavailable'),
])(
  'retries delivery failures without deleting the subscription: %s',
  async (error) => {
    const { reminder, storage } = makeReminder();
    vi.mocked(webpush.sendNotification).mockRejectedValue(error);

    await expect(reminder.alarm()).rejects.toBe(error);
    await expect(reminder.alarm({ retryCount: 4 })).rejects.toBe(error);

    expect(storage.deleteAll).not.toHaveBeenCalled();
    expect(storage.setAlarm).not.toHaveBeenCalled();
  },
);

it.each([
  new WebPushError('Service unavailable', 503, {}, '', subscription.endpoint),
  new Error('Network unavailable'),
])(
  'resumes next morning after the retry budget is exhausted: %s',
  async (error) => {
    const { reminder, storage } = makeReminder();
    vi.mocked(webpush.sendNotification).mockRejectedValue(error);

    await reminder.alarm({ retryCount: 5 });

    expect(storage.deleteAll).not.toHaveBeenCalled();
    expect(storage.setAlarm).toHaveBeenCalledExactlyOnceWith(nextMorning);
  },
);

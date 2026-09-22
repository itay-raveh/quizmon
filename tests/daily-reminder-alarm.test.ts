import { site } from '@/app/site';
import {
  DAILY_REMINDER_MESSAGE,
  VAPID_PUBLIC_KEY,
} from '@/features/reminders/reminder-config';
import webpush, { WebPushError } from 'web-push';
import * as Sentry from '@sentry/cloudflare';
import { DailyReminder } from '../worker/daily-reminder';

vi.mock('@sentry/cloudflare', () => ({ captureException: vi.fn() }));

const subscription = {
  endpoint: 'https://example.com/push',
  keys: { auth: 'test-auth', p256dh: 'test-key' },
};
const deliveryErrors = [
  new WebPushError('Service unavailable', 503, {}, '', subscription.endpoint),
  new Error('Network unavailable'),
];

const nextMorning = Date.parse('2026-09-09T08:00:00.000Z');

const makeReminder = (completedDate?: string, timeZone = 'UTC') => {
  const storage = {
    get: vi
      .fn()
      .mockResolvedValue({ version: 1, subscription, timeZone, completedDate }),
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

it.each([
  {
    timeZone: 'Asia/Tokyo',
    now: '2026-09-07T23:00:00.000Z',
    utcDate: '2026-09-07',
    localDate: '2026-09-08',
    nextAlarm: '2026-09-08T23:00:00.000Z',
  },
  {
    timeZone: 'Pacific/Honolulu',
    now: '2026-09-08T05:00:00.000Z',
    utcDate: '2026-09-08',
    localDate: '2026-09-07',
    nextAlarm: '2026-09-08T18:00:00.000Z',
  },
])(
  'links and suppresses the UTC Daily in $timeZone while scheduling locally',
  async ({ timeZone, now, utcDate, localDate, nextAlarm }) => {
    vi.setSystemTime(new Date(now));
    const completed = makeReminder(utcDate, timeZone);
    await completed.reminder.alarm();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(completed.storage.setAlarm).toHaveBeenCalledExactlyOnceWith(
      Date.parse(nextAlarm),
    );

    const otherDate = makeReminder(localDate, timeZone);
    await otherDate.reminder.alarm();
    expect(webpush.sendNotification).toHaveBeenCalledOnce();
    expect(
      JSON.parse(
        vi.mocked(webpush.sendNotification).mock.calls[0]![1] as string,
      ),
    ).toMatchObject({
      url: `/?daily=${utcDate}&play=1`,
    });
    expect(otherDate.storage.setAlarm).toHaveBeenCalledExactlyOnceWith(
      Date.parse(nextAlarm),
    );
  },
);

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

it.each(deliveryErrors)(
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

it.each(deliveryErrors)(
  'resumes next morning after the retry budget is exhausted: %s',
  async (error) => {
    const { reminder, storage } = makeReminder();
    vi.mocked(webpush.sendNotification).mockRejectedValue(error);

    await reminder.alarm({ retryCount: 5 });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { 'error.kind': 'reminder.delivery' },
    });
    expect(storage.deleteAll).not.toHaveBeenCalled();
    expect(storage.setAlarm).toHaveBeenCalledExactlyOnceWith(nextMorning);
  },
);

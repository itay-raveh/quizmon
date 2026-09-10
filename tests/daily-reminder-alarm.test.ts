import webpush, { WebPushError } from 'web-push';
import { DailyReminder } from '../worker/daily-reminder';

const subscription = {
  endpoint: 'https://example.com/push',
  keys: { auth: 'test-auth', p256dh: 'test-key' },
};
const nextMorning = Date.parse('2026-09-09T08:00:00.000Z');

function makeReminder(completedDate?: string) {
  const records = new Map<string, unknown>([
    ['daily-reminder', { subscription, timeZone: 'UTC', completedDate }],
  ]);
  const storage = {
    get: vi.fn((key: string) => Promise.resolve(records.get(key))),
    put: vi.fn((key: string, value: unknown) => {
      records.set(key, value);
      return Promise.resolve();
    }),
    deleteAll: vi.fn(() => {
      records.clear();
      return Promise.resolve();
    }),
    deleteAlarm: vi.fn().mockResolvedValue(undefined),
    setAlarm: vi.fn().mockResolvedValue(undefined),
  };
  const guard = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve({ enabled: true, expiresAt: Date.now() + 600_000 }),
    );
  const reminder = new DailyReminder(
    { storage },
    {
      DAILY_REMINDERS: { getByName: vi.fn() },
      VAPID_PRIVATE_KEY: 'test-private-key',
      QUIZMON_SPENDING: { get: guard },
    },
  );
  return { reminder, storage, records, guard };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-08T08:00:00Z'));
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

it('does not send or rearm after registration removal', async () => {
  const { reminder, storage, records } = makeReminder();
  records.clear();
  await reminder.alarm();
  expect(webpush.sendNotification).not.toHaveBeenCalled();
  expect(storage.setAlarm).not.toHaveBeenCalled();
});

it('skips completed games and schedules the next morning', async () => {
  const { reminder, storage } = makeReminder('2026-09-08');
  await reminder.alarm();
  expect(webpush.sendNotification).not.toHaveBeenCalled();
  expect(storage.setAlarm).toHaveBeenCalledExactlyOnceWith(nextMorning);
});

it('persists attempts before delivery and suppresses duplicate alarm delivery', async () => {
  const { reminder, storage, records } = makeReminder();
  vi.mocked(webpush.sendNotification).mockImplementation(() => {
    expect(records.get('delivery')).toMatchObject({
      attempts: 1,
      delivered: false,
    });
    return Promise.resolve({ statusCode: 201, headers: {}, body: '' });
  });
  await reminder.alarm();
  await reminder.alarm();
  expect(webpush.sendNotification).toHaveBeenCalledExactlyOnceWith(
    subscription,
    expect.stringContaining('2026-09-08'),
    expect.objectContaining({ timeout: 10_000, TTL: 43_200 }),
  );
  expect(storage.setAlarm).toHaveBeenLastCalledWith(nextMorning);
});

it.each([404, 410])('removes a rejected subscription (%s)', async (status) => {
  const { reminder, storage } = makeReminder();
  vi.mocked(webpush.sendNotification).mockRejectedValue(
    new WebPushError('Expired', status, {}, '', subscription.endpoint),
  );
  await reminder.alarm();
  expect(storage.deleteAll).toHaveBeenCalledOnce();
  expect(storage.setAlarm).not.toHaveBeenCalled();
});

it('spaces retries, persists the six-attempt ceiling, and stops retrying until tomorrow', async () => {
  const { reminder, storage } = makeReminder();
  vi.mocked(webpush.sendNotification).mockRejectedValue(
    new Error('Unavailable'),
  );
  for (let attempt = 0; attempt < 6; attempt++) {
    await reminder.alarm();
    const next = Number(storage.setAlarm.mock.lastCall?.[0]);
    expect(next).toBeGreaterThan(Date.now());
    await reminder.alarm();
    expect(webpush.sendNotification).toHaveBeenCalledTimes(attempt + 1);
    if (attempt < 5) vi.setSystemTime(next);
  }
  expect(storage.setAlarm).toHaveBeenLastCalledWith(nextMorning);
  expect(storage.deleteAll).not.toHaveBeenCalled();
});

it.each([
  null,
  { enabled: false, expiresAt: nextMorning },
  { enabled: true, expiresAt: 0 },
])(
  'cancels background work when spending permission is absent or revoked',
  async (lease) => {
    const { reminder, guard, storage } = makeReminder();
    guard.mockResolvedValue(lease);
    await reminder.alarm();
    expect(storage.deleteAlarm).toHaveBeenCalledOnce();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(storage.setAlarm).not.toHaveBeenCalled();
  },
);

it('fails closed when the spending control cannot be read', async () => {
  const { reminder, guard, storage } = makeReminder();
  guard.mockRejectedValue(new Error('Unavailable'));
  await reminder.alarm();
  expect(storage.deleteAlarm).toHaveBeenCalledOnce();
  expect(webpush.sendNotification).not.toHaveBeenCalled();
});

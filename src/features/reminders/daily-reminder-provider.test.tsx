import { renderHook, waitFor } from '@testing-library/react';
import { resetLocalSave, saveResult } from '../../../tests/fixtures/local-save';
import { DailyReminderProvider } from './DailyReminderProvider';
import { useDailyReminder } from './daily-reminder-context';

const serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  'serviceWorker',
);

beforeEach(async () => {
  localStorage.clear();
  await resetLocalSave();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-13T08:00:00+09:00'));
  vi.stubGlobal('Notification', { permission: 'granted' });
  vi.stubGlobal('PushManager', class {});
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: () => Promise.resolve({ toJSON: () => ({}) }),
        },
      }),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (serviceWorkerDescriptor)
    Object.defineProperty(navigator, 'serviceWorker', serviceWorkerDescriptor);
  else Reflect.deleteProperty(navigator, 'serviceWorker');
  localStorage.clear();
});

it.each(['2026-09-12', '2026-09-13'])(
  'registers only the current UTC Daily as completed (saved: %s)',
  async (date) => {
    await saveResult(
      { kind: 'daily', date, track: { difficulty: 3, scope: 'all' } },
      {
        answers: [],
        contentVersion: 1,
        correctCount: 0,
        elapsedSeconds: 10,
        questionCount: 5,
        score: 0,
      },
    );
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', request);
    const { result, unmount } = renderHook(useDailyReminder, {
      wrapper: DailyReminderProvider,
    });
    await waitFor(() => expect(result.current.status).toBe('enabled'));
    expect(request).toHaveBeenCalledOnce();
    const body = request.mock.calls[0]![1]?.body;
    if (typeof body !== 'string') throw new Error('Missing registration JSON.');
    const registration: unknown = JSON.parse(body);
    if (date === '2026-09-12')
      expect(registration).toHaveProperty('completedDate', date);
    else expect(registration).not.toHaveProperty('completedDate');
    unmount();
  },
);

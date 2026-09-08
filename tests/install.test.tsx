import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { DailyReminderPrompt } from '@/components/DailyReminderPrompt';
import { InstallSetting } from '@/components/InstallSetting';
import * as storage from '@/game/storage';
import { DailyReminderContext } from '@/notifications/daily-reminder-context';
import { InstallProvider } from '@/pwa/InstallProvider';
import { getInstallGuide } from '@/pwa/install-platform';

const setBrowser = (userAgent: string, platform = '', maxTouchPoints = 0) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    value: maxTouchPoints,
  });
};

const dialogMethods = ['showModal', 'close'] as const;
const originalDialogMethods = dialogMethods.map((method) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, method),
);

beforeEach(() => {
  for (const method of dialogMethods) {
    Object.defineProperty(HTMLDialogElement.prototype, method, {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = method === 'showModal';
      },
    });
  }

  localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  setBrowser('Chrome/150.0');
});

afterEach(() => {
  cleanup();
  dialogMethods.forEach((method, index) => {
    const original = originalDialogMethods[index];
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, method, original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, method);
  });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'maxTouchPoints');
});

it.each([
  ['Mozilla iPhone FxiOS/150.0', 'ios'],
  ['Mozilla Android Firefox/150.0', 'firefox-android'],
  ['Mozilla Windows NT 10.0 Firefox/150.0', 'firefox-windows'],
  ['Mozilla Windows NT 10.0 Firefox/142.0', null],
  ['Mozilla Linux Firefox/150.0', null],
  ['Mozilla Macintosh Firefox/150.0', null],
  ['Mozilla Macintosh Version/26.0 Safari/605.1.15', 'safari-mac'],
  ['Mozilla Macintosh Chrome/150.0 Safari/537.36', null],
])('uses appropriate installation help for %s', (ua, expected) => {
  setBrowser(ua);
  expect(getInstallGuide()).toBe(expected);
});

it('recognizes iPad desktop browsing', () => {
  setBrowser('Mozilla Macintosh Version/26.0 Safari/605.1.15', 'MacIntel', 5);
  expect(getInstallGuide()).toBe('ios');
});

const offerPrompt = (
  prompt = vi.fn().mockResolvedValue({ outcome: 'accepted' }),
) => {
  const event = Object.assign(
    new Event('beforeinstallprompt', { cancelable: true }),
    { prompt },
  );
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, prompt };
};

it('waits for browser eligibility, prompts only on click, and consumes the event once', async () => {
  render(
    <InstallProvider>
      <InstallSetting />
    </InstallProvider>,
  );
  expect(
    screen.queryByRole('button', { name: 'Install Quizmon' }),
  ).not.toBeInTheDocument();
  const pending = Promise.withResolvers<{ outcome: string }>();
  const { event, prompt } = offerPrompt(vi.fn(() => pending.promise));
  expect(event.defaultPrevented).toBe(true);
  expect(prompt).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Install Quizmon' }));
  expect(screen.getByRole('button', { name: 'Opening…' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Opening…' }));
  await act(async () => {
    await Promise.resolve();
    pending.resolve({ outcome: 'accepted' });
  });
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole('group', { name: 'Install Quizmon' }),
  ).not.toBeInTheDocument();
});

it('recovers from a rejected prompt without reusing it', async () => {
  render(
    <InstallProvider>
      <InstallSetting />
    </InstallProvider>,
  );
  const { prompt } = offerPrompt(
    vi.fn().mockRejectedValue(new Error('unavailable')),
  );
  await act(async () => {
    await Promise.resolve();
    fireEvent.click(screen.getByRole('button', { name: 'Install Quizmon' }));
  });
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Installation could not open',
  );
  expect(prompt).toHaveBeenCalledTimes(1);
  const next = offerPrompt();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await act(async () => {
    await Promise.resolve();
    fireEvent.click(screen.getByRole('button', { name: 'Install Quizmon' }));
  });
  expect(next.prompt).toHaveBeenCalledTimes(1);
});

it('hides installation when the browser reports installation elsewhere', () => {
  render(
    <InstallProvider>
      <InstallSetting />
    </InstallProvider>,
  );
  offerPrompt();
  act(() => {
    window.dispatchEvent(new Event('appinstalled'));
  });
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('hides installation inside a standalone app even if an event arrives', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);
  render(
    <InstallProvider>
      <InstallSetting />
    </InstallProvider>,
  );
  offerPrompt();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

const enable = vi.fn().mockResolvedValue(undefined);
const recordDailyCompletion = vi.fn();
const ReturnJourney = ({ results = true }: { results?: boolean }) => (
  <DailyReminderContext.Provider
    value={{
      busy: false,
      disable: vi.fn(),
      enable,
      error: null,
      recordDailyCompletion,
      status: 'available',
    }}
  >
    {results ? <DailyReminderPrompt dailyDate="2026-09-08" /> : null}
    <InstallSetting />
  </DailyReminderContext.Provider>
);

it('offers one action after a Daily, remembers dismissal across reloads, and retains Settings help', () => {
  setBrowser('Mozilla iPhone Version/26.0 Safari/605.1.15');
  vi.spyOn(storage, 'readCompletedDailyCount').mockReturnValue(1);
  const view = render(
    <InstallProvider>
      <ReturnJourney />
    </InstallProvider>,
  );
  expect(screen.getByRole('complementary')).toHaveAccessibleName(
    'Ready for tomorrow’s Daily?',
  );
  expect(
    screen.queryByRole('button', { name: 'Remind me' }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    within(screen.getByRole('complementary')).getByRole('button', {
      name: 'How to install',
    }),
  );
  expect(
    screen.getByRole('dialog', { name: 'Install Quizmon' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Install Quizmon' }),
  ).toHaveFocus();
  expect(screen.getByRole('list')).toHaveTextContent('Add to Home Screen');
  fireEvent(
    screen.getByRole('dialog', { name: 'Install Quizmon' }),
    new Event('cancel', { cancelable: true }),
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(enable).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Dismiss install offer' }),
  );
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'How to install' }),
  ).toBeInTheDocument();
  view.unmount();
  render(
    <InstallProvider>
      <ReturnJourney />
    </InstallProvider>,
  );
  expect(
    screen.queryByText('Ready for tomorrow’s Daily?'),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'How to install' }),
  ).toBeInTheDocument();
});

it('does not show a second offer after cancelling native installation', async () => {
  vi.spyOn(storage, 'readCompletedDailyCount').mockReturnValue(1);
  const view = render(
    <InstallProvider>
      <ReturnJourney results={false} />
    </InstallProvider>,
  );
  offerPrompt(vi.fn().mockResolvedValue({ outcome: 'dismissed' }));
  view.rerender(
    <InstallProvider>
      <ReturnJourney />
    </InstallProvider>,
  );
  await act(async () => {
    await Promise.resolve();
    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: 'Install Quizmon',
      }),
    );
  });
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Remind me' }),
  ).not.toBeInTheDocument();
  offerPrompt();
  expect(
    screen.getByRole('button', { name: 'Install Quizmon' }),
  ).toBeInTheDocument();
});

it('keeps the reminder journey available on platforms without installation', () => {
  setBrowser('Mozilla Linux Firefox/150.0');
  vi.spyOn(storage, 'readCompletedDailyCount').mockReturnValue(1);
  render(
    <InstallProvider>
      <ReturnJourney />
    </InstallProvider>,
  );
  expect(screen.getByRole('button', { name: 'Remind me' })).toBeInTheDocument();
  expect(screen.queryByText('Install Quizmon')).not.toBeInTheDocument();
});

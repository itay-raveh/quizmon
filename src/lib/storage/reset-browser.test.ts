const count = vi.hoisted(() => vi.fn());
vi.mock('../sentry', () => ({
  Sentry: { metrics: { count } },
  sentryEnabled: true,
}));

import { trackPageViewed } from '../analytics';
import { discardOldBrowserData } from './reset-browser';

afterEach(() => vi.unstubAllGlobals());

it('keeps the active account database across page loads', async () => {
  const keys = new Map([
    ['quizmon.baseline.account', 'account-1'],
    ['quizmon.account.v1', 'account-1'],
  ]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => keys.get(key) ?? null,
    removeItem: (key: string) => keys.delete(key),
    key: (index: number) => [...keys.keys()][index] ?? null,
    get length() {
      return keys.size;
    },
  });
  vi.stubGlobal('sessionStorage', {
    get length() {
      return 0;
    },
  });
  const deleteDatabase = vi.fn();
  vi.stubGlobal('indexedDB', { deleteDatabase });

  await discardOldBrowserData();

  expect(deleteDatabase).not.toHaveBeenCalled();
  expect(keys.get('quizmon.baseline.account')).toBe('account-1');
  expect(keys.has('quizmon.account.v1')).toBe(false);
});

it('keeps analytics deduplication across startup cleanup and reload', async () => {
  count.mockClear();
  const storage = () => {
    const values = new Map<string, string>();
    return {
      get length() {
        return values.size;
      },
      key: (index: number) => [...values.keys()][index] ?? null,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
  };
  const localStorage = storage();
  const sessionStorage = storage();
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { localStorage, sessionStorage });
  trackPageViewed(new Date('2026-09-24T12:00:00Z'));
  await discardOldBrowserData();
  trackPageViewed(new Date('2026-09-24T12:00:00Z'));
  expect(
    count.mock.calls.filter(([name]) => name === 'quizmon.visitor_first_seen'),
  ).toHaveLength(1);
});

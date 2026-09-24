import { afterEach, expect, it, vi } from 'vitest';
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

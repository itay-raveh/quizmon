import { afterEach, expect, it, vi } from 'vitest';
import { accountSnapshot, loadAccountConfig } from './account';

afterEach(() => vi.unstubAllGlobals());

it('does not turn a sign-in configuration failure into a sync failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

  await loadAccountConfig();

  expect(accountSnapshot().error).toBe('');
});

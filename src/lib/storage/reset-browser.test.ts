import { discardOldBrowserData } from './reset-browser';

it('deletes pre-reset browser data and keeps current data', async () => {
  localStorage.setItem('quizmon.account.v1', 'old-account');
  localStorage.setItem('quizmon.daily-reminder-prompt.v1', 'old');
  localStorage.setItem(
    'quizmon.daily-reminder-subscription.v1',
    '3c29978c-0c0a-4c95-a19d-9d2cf5e36493',
  );
  localStorage.setItem('quizmon.baseline.account', 'new-account');
  sessionStorage.setItem('quizmon.update-state.v1', 'old');
  sessionStorage.setItem('quizmon.baseline.tab', 'new');
  const deleteDatabase = vi.fn((_name: string) => {
    void _name;
    const request = {} as IDBOpenDBRequest;
    queueMicrotask(() => {
      request.onsuccess?.(new Event('success'));
    });
    return request;
  });
  vi.stubGlobal('indexedDB', {
    databases: () =>
      Promise.resolve([
        { name: 'quizmon-account-other-v2.sqlite' },
        { name: 'quizmon-guest-baseline.sqlite' },
        { name: 'unrelated' },
      ]),
    deleteDatabase,
  });
  const removeReminder = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', removeReminder);
  try {
    await discardOldBrowserData();
    expect(removeReminder).toHaveBeenCalledWith(
      '/api/daily-reminders/3c29978c-0c0a-4c95-a19d-9d2cf5e36493',
      { method: 'DELETE' },
    );
    expect(localStorage.getItem('quizmon.account.v1')).toBeNull();
    expect(localStorage.getItem('quizmon.baseline.account')).toBe(
      'new-account',
    );
    expect(sessionStorage.getItem('quizmon.update-state.v1')).toBeNull();
    expect(sessionStorage.getItem('quizmon.baseline.tab')).toBe('new');
    expect(deleteDatabase.mock.calls.map(([name]) => name)).toEqual(
      expect.arrayContaining([
        'quizmon-guest-v2.sqlite',
        'quizmon-account-old-account-v2.sqlite',
        'quizmon-account-other-v2.sqlite',
      ]),
    );
  } finally {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  }
});

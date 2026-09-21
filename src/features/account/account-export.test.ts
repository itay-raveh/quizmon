import { downloadAccountExport } from './account-export';

const account = vi.hoisted(() => ({ owner: 'owner-a' }));
vi.mock('./account', () => ({ accountSnapshot: () => account }));
const payload = {
  format: 'quizmon-account-export',
  version: 1,
  accountId: 'owner-a',
};
let click: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  account.owner = 'owner-a';
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))),
  );
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn().mockReturnValue('blob:export');
      static revokeObjectURL = vi.fn();
    },
  );
  click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('downloads only a completed response belonging to the selected account', async () => {
  await downloadAccountExport();
  expect(click).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledWith(
    '/api/account/export',
    expect.objectContaining({ credentials: 'same-origin' }),
  );
});
it('does not save truncated JSON despite successful response headers', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{"format":'));
  await expect(downloadAccountExport()).rejects.toThrow('incomplete');
  expect(click).not.toHaveBeenCalled();
});
it('does not save another account or a response arriving after account switching', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ ...payload, accountId: 'owner-b' })),
  );
  await expect(downloadAccountExport()).rejects.toThrow('Account changed');
  vi.mocked(fetch).mockImplementation(() => {
    account.owner = 'owner-b';
    return Promise.resolve(new Response(JSON.stringify(payload)));
  });
  account.owner = 'owner-a';
  await expect(downloadAccountExport()).rejects.toThrow('Account changed');
  expect(click).not.toHaveBeenCalled();
});
it('does not download when authorization fails or the stream breaks', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('', { status: 401 }));
  await expect(downloadAccountExport()).rejects.toThrow(
    'Account export failed',
  );
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      new ReadableStream({
        start(c) {
          c.error(new Error('Connection lost'));
        },
      }),
    ),
  );
  await expect(downloadAccountExport()).rejects.toThrow('Connection lost');
  expect(click).not.toHaveBeenCalled();
});

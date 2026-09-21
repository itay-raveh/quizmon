import { accountRequest } from './account';

afterEach(() => vi.unstubAllGlobals());

it.each([
  [500, 'Internal Server Error', 'Sync is unavailable (500).'],
  [401, 'Unauthorized', 'Sign in to the same account to resume syncing.'],
  [
    200,
    '<html>Unavailable</html>',
    'The account service returned an unreadable response. Try again.',
  ],
])(
  'explains an unreadable %i response without leaking parser errors',
  async (status, body, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(body, { status })),
    );
    await expect(accountRequest('/api/account')).rejects.toThrow(message);
  },
);

it('keeps structured account errors available to the sign-in flow', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: 'generation_changed' }, { status: 409 }),
      ),
  );
  await expect(accountRequest('/api/account')).rejects.toThrow(
    'generation_changed',
  );
});

import accountWorker from './worker.ts';

it('pauses account writes before normal routing', async () => {
  const write = await accountWorker.fetch(
    new Request('https://quizmon.example/api/sync/changes', {
      method: 'POST',
    }),
    { ACCOUNT_READ_ONLY: '1' },
  );
  expect(write.status).toBe(503);
  expect(write.headers.get('Retry-After')).toBe('60');
  expect(await write.json()).toEqual({
    error: 'Account sync is temporarily paused.',
  });

  const read = await accountWorker.fetch(
    new Request('https://quizmon.example/api/account'),
    { ACCOUNT_READ_ONLY: '1' },
  );
  expect(await read.text()).toBe('Account service is not configured.');
});

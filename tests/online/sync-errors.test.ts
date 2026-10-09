import assert from 'node:assert/strict';
import { test } from 'node:test';
import { read, SyncReadError } from '../../server/read.ts';
import { syncAdapter } from '../../server/rxdb-sync.ts';
import { createAccountApi } from '../../server/api.ts';

void test('sync reads retry temporary failures and preserve the final status', async () => {
  const originalFetch = globalThis.fetch;
  const values = new Map<string, unknown>();
  values.set('syncToken', 'signed');
  const context = {
    get(name: string) {
      return name === 'sync'
        ? { endpoint: 'https://sync.test' }
        : values.get(name);
    },
    set(name: string, value: unknown) {
      values.set(name, value);
    },
    req: { raw: { headers: new Headers() } },
  } as unknown as Parameters<typeof read>[0];
  try {
    let calls = 0;
    globalThis.fetch = (_url, init) => {
      assert.equal(
        new Headers(init?.headers).get('Authorization'),
        'Bearer signed',
      );
      calls++;
      return Promise.resolve(
        calls === 1
          ? new Response(null, { status: 503 })
          : Response.json({ players: [] }),
      );
    };
    assert.deepEqual(await read(context, 'players', { ids: [] }), {
      players: [],
    });
    assert.equal(calls, 2);

    globalThis.fetch = () => {
      calls++;
      return Promise.resolve(new Response(null, { status: 401 }));
    };
    await assert.rejects(read(context, 'players'), (error) => {
      assert.ok(error instanceof SyncReadError);
      assert.equal(error.status, 401);
      return true;
    });
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test('expired SSE authentication closes an already-started stream', () => {
  let ended = false;
  const response = {
    headersSent: true,
    end() {
      ended = true;
    },
    status() {
      throw new Error('Headers already sent');
    },
  } as unknown as Parameters<typeof syncAdapter.closeConnection>[0];
  syncAdapter.closeConnection(response, 401, 'Unauthorized');
  assert.equal(ended, true);
});

void test('sync reads preserve overload status and retry delay without retrying busy work', async () => {
  const originalFetch = globalThis.fetch;
  const context = {
    get: (name: string) =>
      name === 'sync' ? { endpoint: 'https://sync.test' } : 'signed',
  } as unknown as Parameters<typeof read>[0];
  try {
    for (const [status, retryAfter] of [
      [429, undefined],
      [429, '30'],
      [503, '30'],
    ] as const) {
      let busy = true;
      globalThis.fetch = () => {
        if (!busy)
          return Promise.resolve(Response.json({ incorrectlyRetried: true }));
        busy = false;
        return Promise.resolve(
          new Response(null, {
            status,
            headers: retryAfter ? { 'Retry-After': retryAfter } : undefined,
          }),
        );
      };
      await assert.rejects(read(context, 'export'), (error) => {
        assert.ok(error instanceof SyncReadError);
        assert.equal(error.status, status);
        assert.equal(error.retryAfter, retryAfter);
        return true;
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test('account responses preserve upstream overload status and Retry-After', async () => {
  const originalFetch = globalThis.fetch;
  const origin = 'https://game.example.test';
  const sync = { endpoint: 'https://sync.example.test', audience: 'quizmon' };
  const api = createAccountApi({
    origin,
    sync,
    secret: 'x'.repeat(32),
    connectionString: 'postgresql://unavailable.invalid/test',
    mail: { mode: 'cloudflare', deliver: async () => {} },
  });
  api.get('/overload', async (context) => {
    context.set('sync', sync);
    context.set('syncToken', 'signed');
    return context.json(await read(context, 'export'));
  });
  try {
    for (const [status, header, expected] of [
      [429, undefined, null],
      [429, '1', '1'],
      [503, '30', '30'],
      [429, 'invalid', null],
    ] as const) {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response(null, {
            status,
            headers: header ? { 'Retry-After': header } : undefined,
          }),
        );
      const response = await api.request(origin + '/overload');
      assert.equal(response.status, status);
      assert.equal(response.headers.get('Retry-After'), expected);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      const body = (await response.json()) as { error: unknown };
      assert.equal(typeof body.error, 'string');
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

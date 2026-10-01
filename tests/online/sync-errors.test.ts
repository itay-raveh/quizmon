import assert from 'node:assert/strict';
import { test } from 'node:test';
import { read, SyncReadError } from '../../server/read.ts';
import { syncAdapter } from '../../server/rxdb-sync.ts';

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

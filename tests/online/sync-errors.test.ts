import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  read,
  readBoard,
  readTrainer,
  SyncReadError,
} from '../../server/read.ts';
import { syncAdapter } from '../../server/rxdb-sync.ts';
import { createTrainerProfile } from '../../src/domain/player/trainer-profile.ts';

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

void test('combined social reads preserve cards, viewer, pagination, and rollout responses', async () => {
  const originalFetch = globalThis.fetch;
  const profile = { ...createTrainerProfile(), name: '  Fixture Trainer  ' };
  const player = {
    id: 'fixture',
    name: 'Fixture Trainer',
    partnerPokemon: profile.partnerPokemon,
    leagueCompleted: true,
  };
  const row = {
    playerId: player.id,
    rank: 2,
    score: 100,
    elapsedMilliseconds: 5000,
    ordinal: 1,
    comparable: true,
  };
  const detail = { profile, stats: {}, pokedex: [], record: {} };
  const context = {
    get(name: string) {
      if (name === 'sync') return { endpoint: 'https://sync.test' };
      if (name === 'accountId') return player.id;
      return 'signed';
    },
  } as unknown as Parameters<typeof read>[0];
  try {
    for (const combined of [true, false]) {
      const calls: string[] = [];
      globalThis.fetch = (url, init) => {
        const path = new URL(
          typeof url === 'string'
            ? url
            : url instanceof URL
              ? url.href
              : url.url,
        ).pathname;
        calls.push(path);
        assert.equal(
          new Headers(init?.headers).get('Authorization'),
          'Bearer signed',
        );
        if (path.endsWith('/players'))
          return Promise.resolve(
            Response.json([{ id: player.id, profile, leagueCompleted: true }]),
          );
        if (path.endsWith('/board'))
          return Promise.resolve(
            Response.json({
              total: 3,
              page: [row],
              viewer: row,
              ...(combined
                ? {
                    players: [
                      { id: player.id, profile, leagueCompleted: true },
                    ],
                  }
                : {}),
            }),
          );
        return Promise.resolve(
          Response.json({ ...detail, ...(combined ? { player } : {}) }),
        );
      };
      const board = await readBoard(context, 'training', 'global', 0, 1);
      assert.deepEqual(board.items[0]?.player, player);
      assert.deepEqual(board.viewer?.player, player);
      assert.equal(board.nextCursor, '1');
      assert.equal(calls.length, combined ? 1 : 2);
      calls.length = 0;
      assert.deepEqual(await readTrainer(context, player.id), {
        ...detail,
        player,
      });
      assert.equal(calls.length, combined ? 1 : 2);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

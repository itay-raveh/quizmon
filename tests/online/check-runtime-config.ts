import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { MongoClient } from 'mongodb';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { replicateServer } from 'rxdb-server/plugins/replication-server';
import { archiveCompletion } from '../../src/domain/sync/round-facts.ts';
import { createTrainerProfile } from '../../src/domain/player/trainer-profile.ts';
import { openPlayerDatabase } from '../../src/lib/storage/rxdb-database.ts';
import type {
  SyncedPlayer,
  SyncedRound,
} from '../../src/lib/storage/rxdb-schema.ts';
import {
  playerSchema,
  roundSchema,
} from '../../src/lib/storage/rxdb-schema.ts';
import { startSyncServer } from '../../server/rxdb-sync.ts';
import { completion } from './progress-fixtures.ts';
import {
  accountRequest,
  freePort,
  json,
  signIn,
  startAccountWorker,
  testDatabase,
} from './account-fixture.ts';

const postgres = await testDatabase();
const mongoName = `quizmon_runtime_${crypto.randomUUID().replaceAll('-', '')}`;
const mongoUrl = `mongodb://127.0.0.1:27018/${mongoName}?directConnection=true`;
const mongo = new MongoClient(mongoUrl);
const port = await freePort();
const endpoint = `http://127.0.0.1:${port}`;
const origin = 'http://127.0.0.1:4188';
let worker: Awaited<ReturnType<typeof startAccountWorker>> | undefined;
let sync: Awaited<ReturnType<typeof startSyncServer>> | undefined;
const databases: Awaited<ReturnType<typeof openPlayerDatabase>>[] = [];
const replications: { cancel: () => Promise<unknown> }[] = [];
const within = async <T>(promise: Promise<T>, step: string) => {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${step} timed out`)),
          20_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
};
let workerBase = '';
const jwks = createServer((request, response) => {
  void (async () => {
    try {
      const upstream = await fetch(workerBase + request.url);
      const body = Buffer.from(await upstream.arrayBuffer());
      response.writeHead(upstream.status, {
        'Content-Type':
          upstream.headers.get('content-type') ?? 'application/json',
      });
      response.end(body);
    } catch {
      response.writeHead(503).end();
    }
  })();
});

try {
  worker = await startAccountWorker({
    connectionString: postgres.connectionString,
    origin,
    sync: { endpoint, audience: 'quizmon-runtime' },
    prebuiltWorkerDir: process.env.QUIZMON_PREBUILT_WORKER,
  });
  workerBase = worker.base;
  jwks.listen(4188, '127.0.0.1');
  await once(jwks, 'listening');
  sync = await startSyncServer({
    mongoUrl,
    origin,
    audience: 'quizmon-runtime',
    port,
    databaseName: mongoName,
  });
  assert.equal((await fetch(endpoint + '/health')).status, 200);
  assert.equal(
    (await fetch(`${endpoint}/players/${playerSchema.version}/pull?limit=1`))
      .status,
    401,
  );

  const accounts = [];
  for (let index = 0; index < 2; index++) {
    const { cookie, id } = await signIn(accountRequest(worker.base, origin));
    const tokenResponse: Response = await fetch(
      worker.base + '/api/auth/token',
      {
        headers: { Cookie: cookie },
      },
    );
    assert.equal(tokenResponse.status, 200);
    const token = (await json(tokenResponse)).token;
    assert.equal(typeof token, 'string');
    accounts.push({ id, token: token as string, cookie });
  }
  const [a, b] = accounts;
  assert.ok(a && b && a.id !== b.id);
  await jwtVerify(
    a.token,
    createRemoteJWKSet(new URL('/api/auth/jwks', origin)),
    {
      issuer: origin,
      audience: 'quizmon-runtime',
    },
  );
  const local = async (name: string) => {
    const db = await openPlayerDatabase(name, getRxStorageMemory(), false);
    databases.push(db);
    return db;
  };
  const one = await local('runtimeone');
  const player = await one.players.insert({
    id: a.id,
    ownerId: a.id,
    profile: createTrainerProfile(),
    settings: null,
  });
  const first = replicateServer<SyncedPlayer>({
    collection: one.players,
    replicationIdentifier: 'runtime-player-a',
    url: `${endpoint}/players/${playerSchema.version}`,
    headers: { Authorization: `Bearer ${a.token}` },
    push: {},
    pull: {},
    live: true,
    retryTime: 100,
  });
  replications.push(first);
  await within(first.awaitDocumentPushed(player), 'player push');
  assert.ok(await sync.db.players.findOne(a.id).exec());

  const fact = archiveCompletion(completion(), true, '2026-09-11');
  const round = await one.rounds.insert({ id: fact.id, ownerId: a.id, fact });
  const rounds = replicateServer<SyncedRound>({
    collection: one.rounds,
    replicationIdentifier: 'runtime-round-a',
    url: `${endpoint}/rounds/${roundSchema.version}`,
    headers: { Authorization: `Bearer ${a.token}` },
    push: {},
    pull: {},
    live: true,
    retryTime: 100,
  });
  replications.push(rounds);
  await within(rounds.awaitDocumentPushed(round), 'round push');
  const request = accountRequest(worker.base, origin);
  assert.equal((await request('/api/account', a)).status, 200);
  assert.equal((await request('/api/account', b)).status, 200);
  const social = await json(
    await request('/api/friends/identity', a, {
      expectedAccountId: a.id,
    }),
  );
  const friendCode = (social.player as { code: string }).code;
  const lookup = await json(
    await request(`/api/friends/player/${friendCode}`, b),
  );
  assert.equal((lookup.player as { id: string }).id, a.id);
  const requestId = crypto.randomUUID();
  assert.equal(
    (
      await request('/api/friends/requests', a, {
        expectedAccountId: a.id,
        peerId: b.id,
        requestId,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`/api/friends/requests/${requestId}/accept`, b, {
        expectedAccountId: b.id,
      })
    ).status,
    200,
  );
  assert.equal((await fetch(endpoint + '/read/export')).status, 401);
  const privateExport = await json(
    await fetch(endpoint + '/read/export', {
      headers: { Authorization: `Bearer ${b.token}` },
    }),
  );
  assert.deepEqual(privateExport.rounds, []);
  const trainer = await json(await request(`/api/trainers/${a.id}`, a));
  assert.equal((trainer.player as { id: string }).id, a.id);
  const board = await json(await request('/api/leaderboards/training', a));
  assert.equal(board.total, 1);
  assert.equal((board.viewer as { player: { id: string } }).player.id, a.id);
  const friendsBoard = await json(
    await request('/api/leaderboards/training?scope=friends', b),
  );
  assert.equal(friendsBoard.total, 1);
  const accountExport = await json(await request('/api/account/export', a));
  assert.equal(accountExport.accountId, a.id);
  assert.equal((accountExport.rounds as unknown[]).length, 1);

  const second = await local('runtimetwo');
  const pull = replicateServer<SyncedRound>({
    collection: second.rounds,
    replicationIdentifier: 'runtime-round-a-second',
    url: `${endpoint}/rounds/${roundSchema.version}`,
    headers: { Authorization: `Bearer ${a.token}` },
    push: {},
    pull: {},
    live: false,
    retryTime: 100,
  });
  replications.push(pull);
  await within(pull.awaitInitialReplication(), 'second-device pull');
  assert.ok(await second.rounds.findOne(fact.id).exec());

  const other = await local('runtimeother');
  const isolated = replicateServer<SyncedRound>({
    collection: other.rounds,
    replicationIdentifier: 'runtime-round-b',
    url: `${endpoint}/rounds/${roundSchema.version}`,
    headers: { Authorization: `Bearer ${b.token}` },
    push: {},
    pull: {},
    live: false,
    retryTime: 100,
  });
  replications.push(isolated);
  await within(isolated.awaitInitialReplication(), 'owner isolation pull');
  assert.equal((await other.rounds.find().exec()).length, 0);
  console.log(
    'RxServer account JWT, offline push, second-device pull, and owner isolation passed.',
  );
} finally {
  await Promise.allSettled(
    replications.map((replication) => replication.cancel()),
  );
  await Promise.allSettled(databases.map((database) => database.close()));
  await sync?.server.close();
  await sync?.db.close();
  await worker?.close();
  jwks.close();
  await mongo.connect();
  await mongo.db(`${mongoName}-v0`).dropDatabase();
  await mongo.close();
  await postgres.close();
}

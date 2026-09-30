import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { MongoClient } from 'mongodb';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import { replicateServer } from 'rxdb-server/plugins/replication-server';
import { compactCompletion } from '../../src/domain/sync/compact-rounds.ts';
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

const mongoName = `quizmon_runtime_${crypto.randomUUID().replaceAll('-', '')}`;
const mongoUrl = `mongodb://127.0.0.1:27018/${mongoName}?directConnection=true`;
const postgres = await testDatabase();
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
  await mongo.connect();
  const seeded = await openPlayerDatabase(
    mongoName,
    getRxStorageMongoDB({ connection: mongoUrl }),
    false,
  );
  const historical = compactCompletion(completion('league'));
  await seeded.rounds.insert({
    ...historical,
    ownerId: 'migration-trainer',
  });
  await seeded.close();
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
    appDatabaseName: `${mongoName}_app`,
  });
  assert.equal(
    (await sync.db.rounds.findOne(historical.id).exec())?.answers[0]?.type,
    'pokemonTypes',
  );
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
  assert.equal(
    (
      await fetch(`${endpoint}/rounds/1/push`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${a.token}` },
      })
    ).status,
    404,
  );
  const preflight = await fetch(
    `${endpoint}/players/${playerSchema.version}/pull`,
    {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,sentry-trace,baggage',
      },
    },
  );
  assert.equal(preflight.status, 200);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  assert.match(
    preflight.headers.get('access-control-allow-headers') ?? '',
    /sentry-trace/,
  );
  const failedSync = await fetch(
    `${endpoint}/players/${playerSchema.version}/push`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${a.token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    },
  );
  assert.equal(failedSync.status, 500);
  assert.deepEqual(await failedSync.json(), {
    error: 'Sync temporarily unavailable.',
  });
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

  const fact = compactCompletion(completion());
  const round = await one.rounds.insert({ ...fact, ownerId: a.id });
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
  const firstDaily = compactCompletion(completion('daily'));
  assert(firstDaily.mode === 'daily');
  const firstDailyDoc = await one.rounds.insert({
    ...firstDaily,
    ownerId: a.id,
  });
  await within(rounds.awaitDocumentPushed(firstDailyDoc), 'first Daily push');
  const request = accountRequest(worker.base, origin);
  assert.equal((await request('/api/account', a)).status, 200);
  assert.equal((await request('/api/account', b)).status, 200);
  const social = await json(
    await request('/api/friends/identity', a, {
      expectedAccountId: a.id,
    }),
  );
  assert.equal((social.player as { id: string }).id, a.id);
  const lookup = await json(await request(`/api/friends/player/${a.id}`, b));
  assert.equal((lookup.player as { id: string }).id, a.id);
  const requestId = crypto.randomUUID();
  const requests = await Promise.all([
    request('/api/friends/requests', a, {
      expectedAccountId: a.id,
      peerId: b.id,
      requestId,
    }),
    request('/api/friends/requests', a, {
      expectedAccountId: a.id,
      peerId: b.id,
      requestId: crypto.randomUUID(),
    }),
  ]);
  assert.deepEqual(
    requests.map((response) => response.status),
    [200, 200],
  );
  const sent = await Promise.all(requests.map(json));
  assert.equal(
    (sent[0]!.request as { id: string }).id,
    (sent[1]!.request as { id: string }).id,
  );
  const acceptedId = (sent[0]!.request as { id: string }).id;
  assert.equal(
    (
      await request(`/api/friends/requests/${acceptedId}/accept`, b, {
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
  assert.equal((accountExport.rounds as unknown[]).length, 2);

  const second = await local('runtimetwo');
  const secondDaily = compactCompletion(
    completion('daily', { completedAt: '2026-09-11T11:00:00.000Z' }),
  );
  assert(secondDaily.mode === 'daily');
  await second.rounds.insert({ ...secondDaily, ownerId: a.id });
  const pull = replicateServer<SyncedRound>({
    collection: second.rounds,
    replicationIdentifier: 'runtime-round-a-second',
    url: `${endpoint}/rounds/${roundSchema.version}`,
    headers: { Authorization: `Bearer ${a.token}` },
    push: {},
    pull: {},
    live: true,
    retryTime: 100,
  });
  replications.push(pull);
  await within(pull.awaitInitialReplication(), 'second-device pull');
  assert.ok(await second.rounds.findOne(fact.id).exec());
  const dailyBoard = await json(
    await request(`/api/leaderboards/daily?date=${firstDaily.day}`, a),
  );
  assert.equal(dailyBoard.total, 1);
  assert.equal(
    (
      await mongo
        .db(`${mongoName}_app`)
        .collection<{ _id: string; roundId: string }>('standings')
        .findOne({ _id: `daily/${a.id}/${firstDaily.day}` })
    )?.roundId,
    firstDaily.id,
  );
  const earlierDaily = compactCompletion(
    completion('daily', { completedAt: '2026-09-11T09:00:00.000Z' }),
  );
  const earlierDoc = await second.rounds.insert({
    ...earlierDaily,
    ownerId: a.id,
  });
  await within(pull.awaitDocumentPushed(earlierDoc), 'earlier Daily push');
  const changedBoard = await json(
    await request(`/api/leaderboards/daily?date=${firstDaily.day}`, a),
  );
  assert.equal(changedBoard.total, 1);
  assert.equal(
    (
      await mongo
        .db(`${mongoName}_app`)
        .collection<{ _id: string; roundId: string }>('standings')
        .findOne({ _id: `daily/${a.id}/${firstDaily.day}` })
    )?.roundId,
    earlierDaily.id,
  );
  await pull.cancel();
  replications.splice(replications.indexOf(pull), 1);
  await second.close();
  databases.splice(databases.indexOf(second), 1);

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
  await Promise.all(replications.map((replication) => replication.cancel()));
  assert.equal(
    (
      await fetch(worker.base + '/api/auth/delete-user', {
        method: 'POST',
        headers: {
          Cookie: a.cookie,
          Origin: origin,
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
    ).status,
    200,
  );
  assert.equal((await request('/api/me', a)).status, 401);
  assert.equal((await request('/api/account', b)).status, 200);
  assert.equal(
    (await json(await request('/api/leaderboards/training', b))).total,
    0,
  );
  assert.equal(
    await mongo
      .db(`${mongoName}-v${roundSchema.version}`)
      .collection('players')
      .countDocuments({ id: a.id }),
    0,
  );
  assert.equal(
    await mongo
      .db(`${mongoName}-v${roundSchema.version}`)
      .collection('rounds')
      .countDocuments({ ownerId: a.id }),
    0,
  );
  assert.equal(
    await mongo
      .db(`${mongoName}_app`)
      .collection('standings')
      .countDocuments({ ownerId: a.id }),
    0,
  );
  assert.equal(
    Number(
      (
        await postgres.pool.query<{ count: string }>(
          'SELECT count(*) FROM friend WHERE from_id = $1 OR to_id = $1',
          [a.id],
        )
      ).rows[0]!.count,
    ),
    0,
  );
  console.log(
    'RxServer auth, offline sync, Daily ordering, standings, and deletion passed.',
  );
} finally {
  await Promise.allSettled(
    replications.map((replication) => replication.cancel()),
  );
  await Promise.allSettled(databases.map((database) => database.close()));
  await sync?.server.close();
  await sync?.db.close();
  await worker?.close();
  await postgres.close();
  jwks.close();
  await mongo.connect();
  await mongo.db(`${mongoName}-v0`).dropDatabase();
  await mongo.db(`${mongoName}-v${roundSchema.version}`).dropDatabase();
  await mongo.db(`${mongoName}_app`).dropDatabase();
  await mongo.close();
}

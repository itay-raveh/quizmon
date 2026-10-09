import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import {
  createConnection,
  createServer as createProxy,
  type Socket,
} from 'node:net';
import { Hono } from 'hono';
import { MongoClient } from 'mongodb';
import {
  startTrainerSummaries,
  type CachedTrainer,
} from '../../server/trainer-summaries.ts';
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import { openPlayerDatabase } from '../../src/lib/storage/rxdb-database.ts';
import { createTrainerSummaryWrites } from '../../server/trainer-summary-writes.ts';
import { getReplicationHandlerByCollection } from 'rxdb/plugins/replication-websocket';
import { compactCompletion } from '../../src/domain/sync/compact-rounds.ts';
import { createTrainerProfile } from '../../src/domain/player/trainer-profile.ts';
import { completion } from './progress-fixtures.ts';
import { testMongoUrl } from './account-fixture.ts';
import type { AccountEnv } from '../../server/api.ts';
import { read } from '../../server/read.ts';
import { Worker } from 'node:worker_threads';
import {
  createTrainerProjector,
  type ProjectionMessage,
} from '../../server/trainer-projection.ts';

async function fixture() {
  const name = `trainer_writes_${crypto.randomUUID().replaceAll('-', '')}`;
  const url = new URL(testMongoUrl(name));
  url.searchParams.set('w', 'majority');
  const mongo = await new MongoClient(url.toString(), {
    monitorCommands: true,
  }).connect();
  const facts = mongo.db(`${name}-v0`);
  const app = mongo.db(`${name}_app`);
  const cache = app.collection<CachedTrainer>('summaries');
  const writes = createTrainerSummaryWrites(cache);
  const storage = getRxStorageMongoDB({ connection: url.toString() });
  const db = await openPlayerDatabase(name, writes.wrapStorage(storage), false);
  const store = await startTrainerSummaries(facts, cache, writes);
  return {
    mongo,
    facts,
    app,
    cache,
    writes,
    db,
    store,
    async close() {
      await store.close();
      await db.close();
      await facts.dropDatabase();
      await app.dropDatabase();
      await mongo.close();
    },
  };
}

await test('normal replication, preferences, partial conflicts and deletion invalidate affected summaries before acknowledgement', async () => {
  const f = await fixture();
  try {
    await f.db.players.insert({
      id: 'fixture',
      profile: createTrainerProfile(),
      settings: null,
    });
    const handler = getReplicationHandlerByCollection(f.db, 'rounds');
    const first = {
      ...compactCompletion(completion('training')),
      ownerId: 'fixture',
    };
    assert.deepEqual(
      await handler.masterWrite([
        { newDocumentState: { ...first, _deleted: false } },
      ]),
      [],
    );
    assert.equal((await f.store.trainer('fixture')).stats.masteryRounds, 1);
    assert.equal((await f.store.trainer('unrelated')).stats.masteryRounds, 0);
    await f.db.players
      .findOne('fixture')
      .exec()
      .then((player) =>
        player!.incrementalPatch({
          profile: { ...createTrainerProfile(), name: 'Updated' },
        }),
      );
    assert.equal((await f.store.trainer('fixture')).profile.name, 'Updated');
    assert(await f.cache.findOne({ _id: 'unrelated' }));
    const second = {
      ...compactCompletion(completion('training')),
      ownerId: 'fixture',
    };
    const partial = await f.db.rounds.bulkInsert([first, second]);
    assert.equal(partial.error.length, 1);
    assert.equal(partial.success.length, 1);
    assert.equal((await f.store.trainer('fixture')).stats.masteryRounds, 2);
    await f.db.rounds.bulkRemove(
      await f.db.rounds.find({ selector: { ownerId: 'fixture' } }).exec(),
    );
    await f.db.players
      .findOne('fixture')
      .exec()
      .then((player) => player!.remove());
    assert.equal((await f.store.trainer('fixture')).stats.masteryRounds, 0);
    assert.notEqual((await f.store.trainer('fixture')).profile.name, 'Updated');
    assert(await f.cache.findOne({ _id: 'unrelated' }));
  } finally {
    await f.close();
  }
});

await test('a write racing cache publication cannot publish stale facts, and warm readers wait for that owner only', async () => {
  const f = await fixture();
  const original = f.cache.updateOne.bind(f.cache);
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let read: ReturnType<typeof f.store.trainer> | undefined;
  let write: Promise<unknown> | undefined;
  try {
    await f.db.rounds.insert({
      ...compactCompletion(completion('training')),
      ownerId: 'fixture',
    });
    await f.store.trainer('warm');
    let armed = true;
    f.cache.updateOne = async (
      ...args: Parameters<typeof f.cache.updateOne>
    ) => {
      if (armed && args[0]?._id === 'fixture') {
        armed = false;
        started.resolve();
        await release.promise;
      }
      return original(...args);
    };
    read = f.store.trainer('fixture');
    await started.promise;
    write = f.db.rounds.insert({
      ...compactCompletion(completion('training')),
      ownerId: 'fixture',
    });
    // The storage wrapper marks the generation before the asynchronous Mongo write.
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal((await f.store.trainer('warm')).stats.masteryRounds, 0);
    let returned = false;
    const warm = f.store.players(['fixture']).then((value) => {
      returned = true;
      return value;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(returned, false);
    release.resolve();
    await write;
    assert.equal((await read).stats.masteryRounds, 2);
    assert.equal((await warm)[0]?.leagueCompleted, false);
    assert.equal(
      (await f.cache.findOne({ _id: 'fixture' }))?.detail?.stats.masteryRounds,
      2,
    );
  } finally {
    release.resolve();
    await write?.catch(() => {});
    await read?.catch(() => {});
    f.cache.updateOne = original;
    await f.close();
  }
});

await test('a cache invalidation failure fails writes and reads closed until restart', async () => {
  const f = await fixture();
  const original = f.cache.deleteOne.bind(f.cache);
  try {
    await f.store.trainer('fixture');
    f.cache.deleteOne = () =>
      Promise.reject(new Error('Fixture cache failure'));
    await assert.rejects(
      f.db.rounds.insert({
        ...compactCompletion(completion('training')),
        ownerId: 'fixture',
      }),
      { status: 503 },
    );
    f.cache.deleteOne = original;
    assert.equal(f.store.healthy(), false);
    await assert.rejects(f.store.trainer('fixture'), { status: 503 });
    await assert.rejects(f.store.players(['fixture']), { status: 503 });
    assert.equal(await f.facts.collection('rounds').countDocuments(), 1);
  } finally {
    f.cache.deleteOne = original;
    await f.close();
  }
});

await test('an ambiguous partial storage failure blocks summaries even after cache deletion succeeds', async () => {
  const f = await fixture();
  try {
    await f.store.trainer('fixture');
    const storage = getRxStorageMongoDB({
      connection: testMongoUrl(f.db.name),
    });
    const original = storage.createStorageInstance.bind(storage);
    storage.createStorageInstance = async (params) => {
      const instance = await original(params);
      const bulkWrite = instance.bulkWrite.bind(instance);
      instance.bulkWrite = async (rows, context) => {
        await bulkWrite(rows, context);
        throw new Error('Fixture acknowledgement lost after commit');
      };
      return instance;
    };
    const failing = await f.writes.wrapStorage(storage).createStorageInstance({
      databaseName: f.db.name,
      collectionName: 'rounds',
      schema: f.db.rounds.schema.jsonSchema,
      options: {},
      multiInstance: false,
      databaseInstanceToken: f.db.token,
      devMode: false,
    });
    try {
      const existing = await f.db.rounds.insert({
        ...compactCompletion(completion('training')),
        ownerId: 'fixture',
      });
      const previous = existing.toMutableJSON(true);
      await assert.rejects(
        failing.bulkWrite(
          [
            {
              previous,
              document: {
                ...previous,
                _deleted: true,
                _rev: `2-${crypto.randomUUID()}`,
              },
            },
          ],
          'fixture-ambiguous',
        ),
      );
      assert.equal(f.store.healthy(), false);
      await assert.rejects(f.store.trainer('fixture'), { status: 503 });
      assert.equal(
        (await f.facts.collection('rounds').findOne({ id: previous.id }))
          ?._deleted,
        true,
      );
    } finally {
      await failing.close();
    }
  } finally {
    await f.close();
  }
});

await test('warm reads remain responsive during cold CPU work, and a worker crash cannot publish a stale summary', async () => {
  const name = `trainer_cpu_${crypto.randomUUID().replaceAll('-', '')}`;
  const mongo = await new MongoClient(testMongoUrl(name)).connect();
  const facts = mongo.db(name);
  const cache = mongo.db(`${name}_app`).collection<CachedTrainer>('summaries');
  const running = Promise.withResolvers<void>();
  let armed = false;
  let currentWorker: Worker | undefined;
  let created = 0;
  const projector = createTrainerProjector(() => {
    created++;
    const worker = new Worker(
      new URL('../../server/trainer-projection-worker.ts', import.meta.url),
      { resourceLimits: { maxOldGenerationSizeMb: 128 } },
    );
    currentWorker = worker;
    worker.on('message', (message: ProjectionMessage) => {
      if (armed && message.type === 'started') running.resolve();
    });
    return worker;
  });
  let store: Awaited<ReturnType<typeof startTrainerSummaries>> | undefined;
  let cold: ReturnType<NonNullable<typeof store>['trainer']> | undefined;
  try {
    await facts.collection('rounds').createIndex({ ownerId: 1 });
    const round = compactCompletion(completion('training'));
    for (let offset = 0; offset < 3000; offset += 250)
      await facts.collection('rounds').insertMany(
        Array.from({ length: 250 }, () => ({
          ...round,
          id: crypto.randomUUID(),
          ownerId: 'cold',
          _deleted: false,
        })),
      );
    store = await startTrainerSummaries(
      facts,
      cache,
      createTrainerSummaryWrites(cache),
      projector,
    );
    await store.trainer('warm');
    armed = true;
    let finished = false;
    cold = store.trainer('cold').then((value) => {
      finished = true;
      return value;
    });
    await running.promise;
    const warm = await store.trainer('warm');
    assert.equal(warm.stats.masteryRounds, 0);
    assert.equal(finished, false);
    const rejected = assert.rejects(cold, { status: 503, retryAfter: '1' });
    await currentWorker!.terminate();
    await rejected;
    assert.equal(await cache.findOne({ _id: 'cold' }), null);
    assert.equal((await store.trainer('cold')).stats.masteryRounds, 3000);
    assert.equal(created, 2);
    assert.equal(await facts.collection('rounds').countDocuments(), 3000);
  } finally {
    await cold?.catch(() => {});
    await store?.close();
    await projector.close();
    await facts.dropDatabase();
    await mongo.db(`${name}_app`).dropDatabase();
    await mongo.close();
  }
});

await test('lazy summaries coalesce; warm profile/card reads perform no writes or history replay; restart clears derived values', async (context) => {
  const f = await fixture();
  let histories = 0;
  let writes = 0;
  f.mongo.on('commandStarted', (event) => {
    if (event.commandName === 'find' && event.command.find === 'rounds')
      histories++;
    if (
      ['insert', 'update', 'delete', 'findAndModify'].includes(
        event.commandName,
      )
    )
      writes++;
  });
  let restarted: Awaited<ReturnType<typeof startTrainerSummaries>> | undefined;
  try {
    const league = {
      ...compactCompletion(completion('league')),
      ownerId: 'fixture',
    };
    const daily = {
      ...compactCompletion(
        completion('daily', { completedAt: '2026-09-11T11:00:00.000Z' }),
      ),
      ownerId: 'fixture',
    };
    await f.db.rounds.bulkInsert([league, daily]);
    const simultaneous = await Promise.all(
      Array.from({ length: 8 }, () => f.store.trainer('fixture')),
    );
    assert.equal(histories, 1);
    assert(simultaneous.every((value) => value.stats.leagueCompleted));
    histories = 0;
    writes = 0;
    assert.deepEqual(await f.store.trainer('fixture'), simultaneous[0]);
    assert.equal(
      (await f.store.players(['fixture']))[0]?.leagueCompleted,
      true,
    );
    assert.equal(histories, 0);
    assert.equal(writes, 0);
    assert.equal(
      await f.facts.collection('trainer_summary_barriers').countDocuments(),
      0,
    );
    context.mock.timers.enable({
      apis: ['Date'],
      now: Date.UTC(2026, 8, 11, 19),
    });
    assert.equal((await f.store.trainer('fixture')).record.dayCombo, 1);
    context.mock.timers.setTime(Date.UTC(2026, 8, 13, 19));
    assert.equal((await f.store.trainer('fixture')).record.dayCombo, 0);
    assert.equal(histories, 0);
    context.mock.timers.reset();
    await f.cache.updateOne(
      { _id: 'fixture' },
      { $set: { 'detail.stats.masteryRounds': 999 } },
    );
    await f.store.close();
    // Raw maintenance is explicitly performed while the origin is stopped.
    await f.facts.collection('rounds').deleteOne({ id: league.id });
    restarted = await startTrainerSummaries(f.facts, f.cache, f.writes);
    assert.equal(await f.cache.countDocuments(), 0);
    assert.equal(
      (await restarted.trainer('fixture')).stats.leagueCompleted,
      false,
    );
    assert.equal((await restarted.trainer('fixture')).stats.masteryRounds, 0);
    assert.equal(await f.facts.collection('rounds').countDocuments(), 1);
  } finally {
    context.mock.timers.reset();
    await restarted?.close();
    await f.close();
  }
});

await test('cold work has one waiting slot, and warm reads do not join that queue', async () => {
  const name = `trainer_queue_${crypto.randomUUID().replaceAll('-', '')}`;
  const mongo = await new MongoClient(testMongoUrl(name)).connect();
  const facts = mongo.db(name);
  const cache = mongo.db(`${name}_app`).collection<CachedTrainer>('summaries');
  const release = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  const queued = Promise.withResolvers<void>();
  const collection = facts.collection.bind(facts);
  facts.collection = ((...args: Parameters<typeof facts.collection>) => {
    const result = collection(...args);
    if (args[0] === 'rounds') {
      const find = result.find.bind(result);
      result.find = ((...args: Parameters<typeof result.find>) => {
        const cursor = find(...args);
        if (args[0]?.ownerId === 'first') {
          const toArray = cursor.toArray.bind(cursor);
          cursor.toArray = async () => {
            started.resolve();
            await release.promise;
            return toArray();
          };
        }
        return cursor;
      }) as typeof result.find;
    }
    return result;
  }) as typeof facts.collection;
  const findOne = cache.findOne.bind(cache);
  cache.findOne = (async (...args: Parameters<typeof cache.findOne>) => {
    const value = await findOne(...args);
    if (args[0]?._id === 'second') setImmediate(() => queued.resolve());
    return value;
  }) as typeof cache.findOne;
  let store: Awaited<ReturnType<typeof startTrainerSummaries>> | undefined;
  try {
    await collection('rounds').insertMany(
      ['first', 'second', 'excess', 'warm'].map((ownerId) => ({
        ...compactCompletion(completion('training')),
        id: crypto.randomUUID(),
        ownerId,
        _deleted: false,
      })),
    );
    store = await startTrainerSummaries(
      facts,
      cache,
      createTrainerSummaryWrites(cache),
    );
    await store.trainer('warm');
    const first = store.trainer('first');
    await started.promise;
    const second = store.trainer('second');
    await queued.promise;
    await assert.rejects(store.trainer('excess'), {
      status: 503,
      retryAfter: '1',
    });
    assert.equal((await store.trainer('warm')).stats.masteryRounds, 1);
    release.resolve();
    assert.equal((await first).stats.masteryRounds, 1);
    assert.equal((await second).stats.masteryRounds, 1);
    assert.equal((await store.trainer('excess')).stats.masteryRounds, 1);
  } finally {
    release.resolve();
    await store?.close();
    await facts.dropDatabase();
    await mongo.db(`${name}_app`).dropDatabase();
    await mongo.close();
  }
});

await test('an upstream timeout and retry reuse the completed trainer rebuild', async () => {
  const name = `trainer_retry_${crypto.randomUUID().replaceAll('-', '')}`;
  const mongo = await new MongoClient(testMongoUrl(name), {
    monitorCommands: true,
  }).connect();
  const facts = mongo.db(name);
  const cache = mongo.db(`${name}_app`).collection<CachedTrainer>('summaries');
  const collection = facts.collection.bind(facts);
  let delayed = false;
  let histories = 0;
  let requests = 0;
  let cancelled = 0;
  let completed = 0;
  let reused = false;
  mongo.on('commandStarted', (event) => {
    if (event.commandName === 'find' && event.command.find === 'rounds')
      histories++;
  });
  facts.collection = ((...args: Parameters<typeof facts.collection>) => {
    const result = collection(...args);
    if (args[0] === 'rounds') {
      const find = result.find.bind(result);
      result.find = ((...args: Parameters<typeof result.find>) => {
        const cursor = find(...args);
        const toArray = cursor.toArray.bind(cursor);
        cursor.toArray = async () => {
          if (!delayed) {
            delayed = true;
            await new Promise((resolve) => setTimeout(resolve, 2_200));
          }
          return toArray();
        };
        return cursor;
      }) as typeof result.find;
    }
    return result;
  }) as typeof facts.collection;
  let store: Awaited<ReturnType<typeof startTrainerSummaries>> | undefined;
  const server = createServer((_request, response) => {
    requests++;
    if (requests === 2) reused = completed > 0;
    response.on('close', () => {
      if (!response.writableFinished) cancelled++;
    });
    void store!
      .trainer('fixture')
      .then((value) => {
        completed++;
        if (!response.destroyed) response.end(JSON.stringify(value));
      })
      .catch(() => {
        if (!response.destroyed) response.writeHead(503).end();
      });
  });
  try {
    await collection('rounds').insertOne({
      ...compactCompletion(completion('training')),
      ownerId: 'fixture',
      _deleted: false,
    });
    store = await startTrainerSummaries(
      facts,
      cache,
      createTrainerSummaryWrites(cache),
    );
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert(address && typeof address === 'object');
    const app = new Hono<AccountEnv>();
    app.get('/', async (context) => {
      context.set('syncToken', 'fixture');
      context.set('sync', {
        endpoint: `http://127.0.0.1:${address.port}`,
        audience: 'fixture',
      });
      return context.json(await read(context, 'trainer/fixture'));
    });
    const response = await app.request('/');
    assert.equal(response.status, 200);
    const value = (await response.json()) as Awaited<
      ReturnType<typeof store.trainer>
    >;
    assert.equal(value.stats.masteryRounds, 1);
    assert.equal(requests, 2);
    assert.equal(cancelled, 1);
    assert.equal(reused, true);
    assert.equal(histories, 1);
    assert.equal(await cache.countDocuments(), 1);
    assert.equal(await collection('rounds').countDocuments(), 1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await store?.close();
    await facts.dropDatabase();
    await mongo.db(`${name}_app`).dropDatabase();
    await mongo.close();
  }
});

await test('an unavailable Mongo connection fails promptly without losing facts', async () => {
  const name = `trainer_unavailable_${crypto.randomUUID().replaceAll('-', '')}`;
  const target = new URL(testMongoUrl(name));
  let blocked = false;
  const sockets = new Set<Socket>();
  const proxy = createProxy((incoming) => {
    const outgoing = createConnection({
      host: target.hostname,
      port: Number(target.port || 27017),
    });
    for (const socket of [incoming, outgoing]) {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    }
    incoming.on('data', (data) => {
      if (!blocked) outgoing.write(data);
    });
    outgoing.on('data', (data) => {
      if (!blocked) incoming.write(data);
    });
    incoming.on('error', () => outgoing.destroy());
    outgoing.on('error', () => incoming.destroy());
    incoming.on('close', () => outgoing.destroy());
    outgoing.on('close', () => incoming.destroy());
  });
  proxy.listen(0, '127.0.0.1');
  await once(proxy, 'listening');
  const address = proxy.address();
  assert(address && typeof address === 'object');
  const forwarded = new URL(target);
  forwarded.port = String(address.port);
  const mongo = await new MongoClient(forwarded.toString()).connect();
  const facts = mongo.db(name);
  const cache = mongo.db(`${name}_app`).collection<CachedTrainer>('summaries');
  let store: Awaited<ReturnType<typeof startTrainerSummaries>> | undefined;
  try {
    await facts.collection('rounds').insertOne({
      ...compactCompletion(completion('training')),
      ownerId: 'fixture',
      _deleted: false,
    });
    const original = await facts.collection('rounds').find({}).toArray();
    store = await startTrainerSummaries(
      facts,
      cache,
      createTrainerSummaryWrites(cache),
    );
    await store.trainer('fixture');
    blocked = true;
    const start = performance.now();
    await assert.rejects(store.trainer('fixture'), { status: 503 });
    assert(performance.now() - start < 3_000);
    blocked = false;
    for (const socket of sockets) socket.destroy();
    assert.equal((await store.trainer('fixture')).stats.masteryRounds, 1);
    assert.deepEqual(
      await facts.collection('rounds').find({}).toArray(),
      original,
    );
  } finally {
    blocked = false;
    await store?.close();
    await facts.dropDatabase();
    await mongo.db(`${name}_app`).dropDatabase();
    await mongo.close();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  }
});

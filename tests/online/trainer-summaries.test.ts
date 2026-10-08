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
import {
  MongoClient,
  MongoNetworkError,
  MongoServerError,
  ObjectId,
  UUID,
} from 'mongodb';
import {
  startTrainerSummaries,
  type CachedTrainer,
} from '../../server/trainer-summaries.ts';
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

await test('external ownership updates, replacements and deletion races invalidate previous owners and in-flight summaries', async () => {
  const name = `trainer_ownership_${crypto.randomUUID().replaceAll('-', '')}`;
  const mongo = await new MongoClient(testMongoUrl(name)).connect();
  const facts = mongo.db(name);
  const rounds = facts.collection('rounds');
  const cache = mongo.db(`${name}_app`).collection<CachedTrainer>('summaries');
  let store: Awaited<ReturnType<typeof startTrainerSummaries>> | undefined;
  const updateOne = cache.updateOne.bind(cache);
  const round = {
    ...compactCompletion(completion('training')),
    ownerId: 'old',
    _deleted: false,
  };
  try {
    await rounds.insertOne(round);
    store = await startTrainerSummaries(facts, cache);
    assert.equal((await store.trainer('old')).stats.masteryRounds, 1);
    assert.equal((await store.trainer('new')).stats.masteryRounds, 0);
    await rounds.updateOne({ id: round.id }, { $set: { ownerId: 'new' } });
    assert.equal((await store.trainer('old')).stats.masteryRounds, 0);
    assert.equal((await store.trainer('new')).stats.masteryRounds, 1);
    await rounds.replaceOne({ id: round.id }, round);
    assert.equal((await store.trainer('old')).stats.masteryRounds, 1);
    assert.equal((await store.trainer('new')).stats.masteryRounds, 0);

    for (const action of ['reassign', 'delete'] as const) {
      await cache.deleteOne({ _id: 'old' });
      let raced = false;
      cache.updateOne = async (...args: Parameters<typeof cache.updateOne>) => {
        if (!raced && args[0]?._id === 'old') {
          raced = true;
          if (action === 'reassign')
            await rounds.updateOne(
              { id: round.id },
              { $set: { ownerId: 'new' } },
            );
          else await rounds.deleteOne({ id: round.id });
          // Drain the committed change before this stale publication lands.
          await store!.settled();
        }
        return updateOne(...args);
      };
      assert.equal((await store.trainer('old')).stats.masteryRounds, 0);
      assert.equal(
        (await cache.findOne({ _id: 'old' }))?.detail?.stats.masteryRounds,
        0,
      );
      assert.equal(
        (await store.trainer('new')).stats.masteryRounds,
        action === 'reassign' ? 1 : 0,
      );
      cache.updateOne = updateOne;
      if (action === 'reassign')
        await rounds.replaceOne({ id: round.id }, round);
    }
    assert.equal(await rounds.countDocuments(), 0);
    await facts
      .collection('players')
      .insertOne({ id: 'malformed', profile: null, _deleted: false });
    await assert.rejects(store.trainer('malformed'));
    assert.equal(await cache.findOne({ _id: 'malformed' }), null);
    assert.equal(
      (await facts.collection('players').findOne({ id: 'malformed' }))?.profile,
      null,
    );
  } finally {
    cache.updateOne = updateOne;
    await store?.close();
    await facts.dropDatabase();
    await mongo.db(`${name}_app`).dropDatabase();
    await mongo.close();
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
    store = await startTrainerSummaries(facts, cache, projector);
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

await test('lazy summaries coalesce, persist, invalidate external facts, and fail closed', async (context) => {
  const name = `trainer_summary_${crypto.randomUUID().replaceAll('-', '')}`;
  const mongo = await new MongoClient(testMongoUrl(name), {
    monitorCommands: true,
  }).connect();
  const facts = mongo.db(`${name}-v0`);
  const app = mongo.db(`${name}_app`);
  const cache = app.collection<CachedTrainer>('trainer_summaries');
  const originalWatch = facts.watch.bind(facts);
  let loseHistory = false;
  let disconnectOnce = false;
  let flood = false;
  facts.watch = ((...args: Parameters<typeof facts.watch>) => {
    const stream = originalWatch(...args);
    const next = stream.tryNext.bind(stream);
    stream.tryNext = async () => {
      if (flood) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          _id: { fixture: true },
          operationType: 'insert',
          collectionUUID: new UUID(),
          ns: { db: facts.databaseName, coll: 'rounds' },
          documentKey: { _id: new ObjectId() },
          fullDocument: { ownerId: 'unrelated' },
        };
      }
      if (disconnectOnce) {
        disconnectOnce = false;
        throw new MongoNetworkError('Fixture disconnection');
      }
      if (loseHistory) {
        loseHistory = false;
        throw new MongoServerError({
          code: 286,
          codeName: 'ChangeStreamHistoryLost',
          message: 'Fixture expired cursor',
        });
      }
      return next();
    };
    return stream;
  }) as typeof facts.watch;
  let store: Awaited<ReturnType<typeof startTrainerSummaries>> | undefined;
  let roundReads = 0;
  const pendingReads = new Set<number>();
  let peakReads = 0;
  let markerWrites = 0;
  mongo.on('commandStarted', (event) => {
    if (
      (event.commandName === 'insert' &&
        event.command.insert === 'trainer_summary_barriers') ||
      (event.commandName === 'delete' &&
        event.command.delete === 'trainer_summary_barriers')
    )
      markerWrites++;
    if (event.commandName === 'find' && event.command.find === 'rounds') {
      roundReads++;
      pendingReads.add(event.requestId);
      peakReads = Math.max(peakReads, pendingReads.size);
    }
  });
  mongo.on('commandSucceeded', (event) => pendingReads.delete(event.requestId));
  mongo.on('commandFailed', (event) => pendingReads.delete(event.requestId));
  try {
    await facts
      .collection('rounds')
      .createIndex({ ownerId: 1, completedAt: 1, id: 1 });
    const profile = { ...createTrainerProfile(), name: 'Fixture' };
    await facts
      .collection('players')
      .insertOne({ id: 'fixture', profile, _deleted: false });
    const league = {
      ...compactCompletion(completion('league')),
      ownerId: 'fixture',
      _deleted: false,
    };
    await facts.collection('rounds').insertOne(league);
    store = await startTrainerSummaries(facts, cache);
    assert.equal(await cache.countDocuments(), 0);
    roundReads = 0;
    const simultaneous = await Promise.all(
      Array.from({ length: 8 }, () => store!.trainer('fixture')),
    );
    assert.equal(roundReads, 1);
    assert(simultaneous.every((value) => value.stats.leagueCompleted));
    const persisted = await cache.findOne({ _id: 'fixture' });
    assert(persisted?.detail);
    roundReads = 0;
    markerWrites = 0;
    assert.deepEqual(await store.trainer('fixture'), simultaneous[0]);
    const cards = await store.players(['fixture']);
    assert.equal(cards[0]?.leagueCompleted, true);
    assert.equal(roundReads, 0);
    assert.equal(markerWrites, 4); // One insert/delete freshness fence per warm read.
    await facts.collection('rounds').insertMany(
      ['second', 'third'].map((ownerId) => ({
        ...compactCompletion(completion('training')),
        ownerId,
        _deleted: false,
      })),
    );
    peakReads = 0;
    await Promise.all(
      ['second', 'third'].map((owner) => store!.trainer(owner)),
    );
    assert.equal(peakReads, 1);
    assert.equal(
      await facts.collection('trainer_summary_barriers').countDocuments(),
      0,
    );

    // Direct Mongo writes model imports/another writer; RxDB events are not used.
    await facts
      .collection('players')
      .updateOne({ id: 'fixture' }, { $set: { 'profile.name': 'Updated' } });
    assert.equal((await store.trainer('fixture')).profile.name, 'Updated');
    const daily = {
      ...compactCompletion(
        completion('daily', { completedAt: '2026-09-11T11:00:00.000Z' }),
      ),
      ownerId: 'fixture',
      _deleted: false,
    };
    await facts.collection('rounds').insertOne(daily);
    const training = {
      ...compactCompletion(completion('training')),
      ownerId: 'fixture',
      _deleted: false,
    };
    await facts.collection('rounds').insertOne(training);
    const current = await store.trainer('fixture');
    assert.equal(current.stats.bestDailyStreak, 1);
    assert.equal(current.stats.masteryRounds, 1);
    roundReads = 0;
    context.mock.timers.enable({
      apis: ['Date'],
      now: Date.UTC(2026, 8, 11, 19),
    });
    assert.equal((await store.trainer('fixture')).record.dayCombo, 1);
    context.mock.timers.setTime(Date.UTC(2026, 8, 13, 19));
    assert.equal((await store.trainer('fixture')).record.dayCombo, 0);
    assert.equal(roundReads, 0);
    context.mock.timers.reset();
    const earlier = {
      ...compactCompletion(
        completion('daily', { completedAt: '2026-09-11T09:00:00.000Z' }),
      ),
      ownerId: 'fixture',
      _deleted: false,
    };
    earlier.answers[0]!.selected = ['ivysaur'];
    await facts.collection('rounds').insertOne(earlier);
    const reordered = await store.trainer('fixture');
    assert.equal(reordered.stats.bestDailyStreak, 1);
    assert.equal(
      reordered.stats.correctCategories.type,
      (current.stats.correctCategories.type ?? 0) - 1,
    );
    await facts
      .collection('rounds')
      .updateOne({ id: training.id }, { $set: { _deleted: true } });
    assert.equal((await store.trainer('fixture')).stats.masteryRounds, 0);
    await facts.collection('rounds').deleteOne({ id: league.id });
    assert.equal((await store.trainer('fixture')).stats.leagueCompleted, false);
    await facts
      .collection('rounds')
      .updateOne({ id: training.id }, { $set: { _deleted: false } });
    assert.equal((await store.trainer('fixture')).stats.masteryRounds, 1);

    // An unrelated owner's write must not replay this owner's history twice.
    await cache.deleteOne({ _id: 'fixture' });
    {
      const original = cache.updateOne.bind(cache);
      let unrelated = false;
      cache.updateOne = async (...args: Parameters<typeof cache.updateOne>) => {
        if (!unrelated) {
          unrelated = true;
          await facts.collection('players').insertOne({
            id: 'unrelated',
            profile: createTrainerProfile(),
            _deleted: false,
          });
        }
        return original(...args);
      };
      roundReads = 0;
      assert.equal((await store.trainer('fixture')).stats.masteryRounds, 1);
      assert.equal(roundReads, 1);
      cache.updateOne = original;
    }

    // Change facts after the history read but before publication; never persist old output.
    await cache.deleteMany({});
    const original = cache.updateOne.bind(cache);
    let raced = false;
    let duringPublication: ReturnType<typeof store.players> | undefined;
    cache.updateOne = async (...args: Parameters<typeof cache.updateOne>) => {
      const first = !raced;
      if (first) {
        raced = true;
        await facts
          .collection('rounds')
          .updateOne({ id: training.id }, { $set: { _deleted: true } });
        await facts.collection('rounds').insertOne(league);
        await store!.settled();
      }
      const result = await original(...args);
      if (first) duringPublication = store!.players(['fixture']);
      return result;
    };
    assert.equal((await store.trainer('fixture')).stats.masteryRounds, 0);
    assert.equal((await duringPublication)?.[0]?.leagueCompleted, true);
    cache.updateOne = original;
    assert.equal((await store.trainer('fixture')).stats.masteryRounds, 0);

    await cache.updateOne(
      { _id: 'fixture' },
      { $set: { 'detail.stats.masteryRounds': 999 } },
    );
    await store.close();
    store = await startTrainerSummaries(facts, cache);
    assert.equal(await cache.countDocuments(), 0);
    assert.equal((await store.trainer('fixture')).stats.masteryRounds, 0);
    loseHistory = true;
    await assert.rejects(store.trainer('fixture'), { status: 503 });
    assert.equal(await cache.countDocuments(), 0);
    assert.equal(store.healthy(), true);
    assert.equal((await store.trainer('fixture')).stats.masteryRounds, 0);
    await store.trainer('second');
    await facts
      .collection('rounds')
      .updateOne({ id: training.id }, { $set: { _deleted: false } });
    disconnectOnce = true;
    await assert.rejects(store.trainer('fixture'), { status: 503 });
    assert.equal(store.healthy(), true);
    assert.equal((await store.trainer('fixture')).stats.masteryRounds, 1);
    assert.equal(await cache.countDocuments(), 1);
    flood = true;
    const blockedAt = performance.now();
    await assert.rejects(store.trainer('fixture'), { status: 503 });
    assert(performance.now() - blockedAt < 3_000);
    flood = false;
    assert.equal((await store.trainer('fixture')).stats.masteryRounds, 1);
    await facts.dropDatabase();
    await assert.rejects(store.trainer('fixture'));
    assert.equal(store.healthy(), false);
  } finally {
    await store?.close();
    await facts.dropDatabase();
    await app.dropDatabase();
    await mongo.close();
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
    store = await startTrainerSummaries(facts, cache);
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
    store = await startTrainerSummaries(facts, cache);
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
    store = await startTrainerSummaries(facts, cache);
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

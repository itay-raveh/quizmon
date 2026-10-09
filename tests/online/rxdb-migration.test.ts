import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { MongoClient } from 'mongodb';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import type { Express } from 'express';
import { createRxServer } from 'rxdb-server/plugins/server';
import { RxServerAdapterExpress } from 'rxdb-server/plugins/adapter-express';
import { replicateServer } from 'rxdb-server/plugins/replication-server';
import { startSyncServer } from '../../server/rxdb-sync.ts';
import {
  openPlayerDatabase,
  type PlayerDatabase,
} from '../../src/lib/storage/rxdb-database.ts';
import {
  playerSchema,
  roundSchema,
} from '../../src/lib/storage/rxdb-schema.ts';
import { scoreCompactRound } from '../../src/domain/sync/compact-rounds.ts';
import { legacyProgress, openLegacyDatabase } from '../legacy-progress.ts';
import { isRecord } from '../../src/lib/validation.ts';
import { freePort, testMongoUrl } from './account-fixture.ts';

const within = async <T>(promise: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Migration replication timed out')),
          15_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

await test(
  'native Mongo and offline browser migration preserve checkpoints, immutable replay and derived reads',
  { timeout: 60_000 },
  async () => {
    const name = `quizmon_native_${crypto.randomUUID().replaceAll('-', '')}`;
    const clientName = `quizmon_offline_${crypto.randomUUID().replaceAll('-', '')}`;
    const mongoUrl = testMongoUrl(name);
    const mongo = await new MongoClient(mongoUrl).connect();
    const browserStorage = getRxStorageDexie({ indexedDB, IDBKeyRange });
    const port = await freePort();
    const origin = `http://127.0.0.1:${await freePort()}`;
    const endpoint = `http://127.0.0.1:${port}`;
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    const jwks = createServer((_request, response) =>
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          keys: [{ ...jwk, kid: 'migration-test', alg: 'RS256', use: 'sig' }],
        }),
      ),
    );
    jwks.listen(Number(new URL(origin).port), '127.0.0.1');
    await once(jwks, 'listening');
    const ownerId = 'migration-player';
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'migration-test' })
      .setSubject(ownerId)
      .setIssuer(origin)
      .setAudience('migration-test')
      .setExpirationTime('5m')
      .sign(privateKey);
    const headers = { Authorization: `Bearer ${token}` };
    let oldServer:
      | Awaited<ReturnType<typeof createRxServer<Express, { ownerId: string }>>>
      | undefined;
    let production: Awaited<ReturnType<typeof startSyncServer>> | undefined;
    let serverDb: PlayerDatabase | undefined;
    let browserDb: PlayerDatabase | undefined;
    const replications: { cancel: () => Promise<unknown> }[] = [];
    const errors: string[] = [];
    try {
      const fixture = legacyProgress(ownerId);
      serverDb = await openLegacyDatabase(
        name,
        getRxStorageMongoDB({ connection: mongoUrl }),
      );
      const stored = await serverDb.rounds.insert(fixture.legacy);
      await serverDb.players.insert(fixture.player);
      const serverRaw = stored.toMutableJSON(true);
      oldServer = await createRxServer({
        database: serverDb,
        adapter: RxServerAdapterExpress,
        hostname: '127.0.0.1',
        port,
        authHandler: () =>
          Promise.resolve({
            data: { ownerId },
            validUntil: Date.now() + 60_000,
          }),
      });
      oldServer.addReplicationEndpoint({
        name: 'rounds',
        collection: serverDb.rounds,
      });
      oldServer.addReplicationEndpoint({
        name: 'players',
        collection: serverDb.players,
      });
      await oldServer.start();
      browserDb = await openLegacyDatabase(clientName, browserStorage);
      const legacyRounds = replicateServer({
        collection: browserDb.rounds,
        replicationIdentifier: `quizmon-rounds-${ownerId}`,
        url: `${endpoint}/rounds/0`,
        headers,
        pull: {},
        push: {},
        live: true,
        retryTime: 100,
      });
      const legacyPlayers = replicateServer({
        collection: browserDb.players,
        replicationIdentifier: `quizmon-players-${ownerId}`,
        url: `${endpoint}/players/0`,
        headers,
        pull: {},
        push: {},
        live: true,
        retryTime: 100,
      });
      replications.push(legacyRounds, legacyPlayers);
      await within(
        Promise.all([
          legacyRounds.awaitInitialReplication(),
          legacyPlayers.awaitInitialReplication(),
        ]),
      );
      const oldCheckpoint = (
        await legacyRounds.metaInstance!.findDocumentsById(['down|1'], false)
      )[0]?.checkpointData;
      assert.ok(oldCheckpoint);
      await Promise.all(
        replications.map((replication) => replication.cancel()),
      );
      replications.length = 0;
      const queued = legacyProgress(ownerId);
      await browserDb.rounds.insert(queued.legacy);
      const preferences = (await browserDb.players.findOne(ownerId).exec())!;
      await preferences.incrementalModify((data) => ({
        ...data,
        profile: { ...data.profile, usePokedexProportions: true },
      }));
      await browserDb.close();
      browserDb = undefined;
      await RxServerAdapterExpress.closeAllConnections(oldServer.serverApp);
      await oldServer.close();
      oldServer = undefined;
      await serverDb.close();
      serverDb = undefined;

      // Current startup performs native Mongo migration before clearing/rebuilding derived caches.
      production = await startSyncServer({
        mongoUrl,
        origin,
        audience: 'migration-test',
        port,
        databaseName: name,
        appDatabaseName: `${name}_app`,
      });
      assert.deepEqual(
        (await production.db.rounds
          .findOne(fixture.current.id)
          .exec())!.toMutableJSON(true),
        { ...serverRaw, answers: fixture.current.answers },
      );
      for (const collection of ['rounds', 'players']) {
        for (const operation of ['pull', 'push', 'pullStream']) {
          const response = await fetch(
            `${endpoint}/${collection}/0/${operation}`,
            {
              headers,
              ...(operation === 'push'
                ? {
                    method: 'POST',
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify([
                      {
                        newDocumentState: { ...queued.legacy, _deleted: false },
                      },
                    ]),
                  }
                : {}),
              signal: AbortSignal.timeout(5000),
            },
          );
          assert.equal(
            response.status,
            426,
            `${collection}/${operation} rejects the old schema`,
          );
          await response.arrayBuffer();
        }
      }
      browserDb = await openPlayerDatabase(clientName, browserStorage, false);
      const rounds = replicateServer({
        collection: browserDb.rounds,
        replicationIdentifier: `quizmon-rounds-${ownerId}`,
        url: `${endpoint}/rounds/${roundSchema.version}`,
        headers,
        pull: {},
        push: {},
        live: false,
        autoStart: false,
        retryTime: 100,
      });
      replications.push(rounds);
      const metaInfo = await rounds.metaInfoPromise;
      const meta = await browserStorage.createStorageInstance({
        databaseName: clientName,
        databaseInstanceToken: browserDb.token,
        collectionName: metaInfo.collectionName,
        schema: metaInfo.schema,
        multiInstance: false,
        options: {},
        devMode: false,
      });
      try {
        const checkpoint: unknown = (
          await meta.findDocumentsById(['down|1'], false)
        )[0]?.checkpointData;
        const assumed: unknown = (
          await meta.findDocumentsById([`${fixture.current.id}|0`], false)
        )[0]?.docData;
        assert.deepEqual(checkpoint, oldCheckpoint);
        assert.ok(isRecord(assumed));
        assert.deepEqual(assumed.answers, fixture.current.answers);
      } finally {
        await meta.close();
      }
      rounds.error$.subscribe(() => errors.push('round replication error'));
      rounds.forbidden$.subscribe(() =>
        errors.push('immutable round rejected'),
      );
      const players = replicateServer({
        collection: browserDb.players,
        replicationIdentifier: `quizmon-players-${ownerId}`,
        url: `${endpoint}/players/${playerSchema.version}`,
        headers,
        pull: {},
        push: {},
        live: false,
        retryTime: 100,
      });
      replications.push(players);
      players.error$.subscribe(() => errors.push('player replication error'));
      await rounds.start();
      await within(
        Promise.all([
          rounds.awaitInitialReplication(),
          players.awaitInitialReplication(),
        ]),
      );
      assert.deepEqual(errors, []);
      assert.equal(
        (await production.db.rounds.find({ selector: { ownerId } }).exec())
          .length,
        2,
      );
      assert.deepEqual(
        (await production.db.rounds
          .findOne(queued.current.id)
          .exec())!.toMutableJSON(),
        queued.current,
      );
      assert.equal(
        (await production.db.players.findOne(ownerId).exec())!.profile
          .usePokedexProportions,
        true,
      );
      assert.equal((await fetch(`${endpoint}/health`)).status, 200);
      const trainer = await fetch(`${endpoint}/read/trainer/${ownerId}`, {
        headers,
      });
      assert.equal(trainer.status, 200);
      const view = (await trainer.json()) as {
        stats: { correctQuestionTypes: Record<string, number> };
      };
      assert.equal(
        Object.values(view.stats.correctQuestionTypes).reduce(
          (sum, count) => sum + count,
          0,
        ),
        scoreCompactRound(fixture.current).correctCount +
          scoreCompactRound(queued.current).correctCount,
      );
      const board = await fetch(`${endpoint}/read/board`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'training',
          visible: null,
          offset: 0,
          limit: 10,
        }),
      });
      assert.equal(board.status, 200);
      const ranking = (await board.json()) as {
        total: number;
        page: { score: number }[];
      };
      assert.equal(ranking.total, 1);
      assert.equal(
        ranking.page[0]!.score,
        Math.max(
          scoreCompactRound(fixture.current).score,
          scoreCompactRound(queued.current).score,
        ),
      );
      await rounds.cancel();
      await players.cancel();
      await browserDb.close();
      browserDb = undefined;
      browserDb = await openPlayerDatabase(clientName, browserStorage, false);
      assert.equal((await browserDb.rounds.find().exec()).length, 2);
      assert.deepEqual(
        (await browserDb.rounds.findOne(fixture.current.id).exec())!.answers,
        fixture.current.answers,
      );
    } finally {
      await Promise.allSettled(
        replications.map((replication) => replication.cancel()),
      );
      await oldServer?.close();
      await production?.server.close();
      await production?.db.close();
      await serverDb?.close();
      await browserDb?.remove();
      jwks.close();
      for (const version of new Set([
        0,
        playerSchema.version,
        roundSchema.version,
      ]))
        await mongo.db(`${name}-v${version}`).dropDatabase();
      await mongo.db(`${name}_app`).dropDatabase();
      await mongo.close();
    }
  },
);

import { createRemoteJWKSet, jwtVerify } from 'jose';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import * as Sentry from '@sentry/node';
import { MongoClient } from 'mongodb';
import { z } from 'zod';
import { createRxServer } from 'rxdb-server/plugins/server';
import { RxServerAdapterExpress } from 'rxdb-server/plugins/adapter-express';
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import { addRxPlugin } from 'rxdb/plugins/core';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
import { savedSettingsSchema } from '../src/domain/player/schemas/player-data.ts';
import { trainerProfileSchema } from '../src/domain/player/trainer-profile.ts';
import { compactRoundSchema } from '../src/domain/sync/compact-rounds.ts';
import { openPlayerDatabase } from '../src/lib/storage/rxdb-database.ts';
import { playerProfiles, trainerProfile } from './rxdb-read.ts';
import { boardRows, startStandings, type Standing } from './standings.ts';

const accountId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
addRxPlugin(RxDBCleanupPlugin);
const idsRequest = z.object({ ids: z.array(accountId).max(101) });
const boardRequest = z.object({
  mode: z.enum(['daily', 'training']),
  visible: z.array(accountId).max(1000).nullable(),
  offset: z.int().min(0),
  limit: z.int().min(1).max(100),
  day: z.string().optional(),
});

export const syncAdapter: typeof RxServerAdapterExpress = {
  ...RxServerAdapterExpress,
  closeConnection(response, code, message) {
    // An SSE response has already sent 200 headers when its token expires.
    if (response.headersSent) {
      response.end();
      return;
    }
    RxServerAdapterExpress.closeConnection(response, code, message);
  },
};

export async function startSyncServer(config: {
  mongoUrl: string;
  mongoTlsCaFile?: string;
  mongoTlsCertKeyFile?: string;
  origin: string;
  audience: string;
  port: number;
  databaseName?: string;
  appDatabaseName?: string;
}) {
  const jwks = createRemoteJWKSet(new URL('/api/auth/jwks', config.origin));
  const connection = new URL(config.mongoUrl);
  if (config.mongoTlsCaFile)
    connection.searchParams.set('tlsCAFile', config.mongoTlsCaFile);
  if (config.mongoTlsCertKeyFile)
    connection.searchParams.set(
      'tlsCertificateKeyFile',
      config.mongoTlsCertKeyFile,
    );
  const db = await openPlayerDatabase(
    config.databaseName ?? 'quizmon_progress',
    getRxStorageMongoDB({ connection: connection.toString() }),
    false,
  );
  let client: MongoClient | undefined;
  let standings: Awaited<ReturnType<typeof startStandings>> | undefined;
  try {
    client = await new MongoClient(connection.toString()).connect();
    const mongoClient = client;
    const appStorage = client.db(config.appDatabaseName ?? 'quizmon_app');
    standings = await startStandings(
      db,
      appStorage.collection<Standing>('standings'),
    );
    const board = standings;
    const verify = async (authorization?: string) => {
      if (!authorization?.startsWith('Bearer '))
        throw new Error('Missing sync token.');
      const { payload } = await jwtVerify(authorization.slice(7), jwks, {
        issuer: config.origin,
        audience: config.audience,
      });
      if (typeof payload.sub !== 'string' || !payload.exp)
        throw new Error('Invalid sync token.');
      return { ownerId: payload.sub, validUntil: payload.exp * 1000 };
    };
    const server = await createRxServer({
      database: db,
      adapter: syncAdapter,
      hostname: '0.0.0.0',
      port: config.port,
      cors: config.origin,
      authHandler: async (headers) => {
        const { ownerId, validUntil } = await verify(headers.authorization);
        return {
          data: { ownerId },
          validUntil,
        };
      },
    });
    server.addReplicationEndpoint({
      name: 'players',
      collection: db.players,
      queryModifier: (auth, query) => ({
        ...query,
        selector: {
          $and: [query.selector, { id: { $eq: auth.data.ownerId } }],
        },
      }),
      changeValidator: (auth, change) => {
        const player = change.newDocumentState;
        return (
          player.id === auth.data.ownerId &&
          trainerProfileSchema.safeParse(player.profile).success &&
          (player.settings === null ||
            savedSettingsSchema.safeParse(player.settings).success)
        );
      },
    });
    server.addReplicationEndpoint({
      name: 'rounds',
      collection: db.rounds,
      queryModifier: (auth, query) => ({
        ...query,
        selector: {
          $and: [query.selector, { ownerId: { $eq: auth.data.ownerId } }],
        },
      }),
      changeValidator: (auth, change) => {
        const round = change.newDocumentState;
        return (
          !change.assumedMasterState &&
          !round._deleted &&
          round.ownerId === auth.data.ownerId &&
          compactRoundSchema.safeParse(round).success
        );
      },
    });
    server.serverApp.get('/health', (_request, response) => {
      response
        .status(board.healthy() ? 200 : 503)
        .send(board.healthy() ? 'ok' : 'unavailable');
    });
    server.serverApp.use('/read', express.json({ limit: '32kb' }));
    server.serverApp.use('/read', (request, response, next) => {
      void verify(request.headers.authorization)
        .then(({ ownerId }) => {
          response.locals.ownerId = ownerId;
          next();
        })
        .catch(() => response.sendStatus(401));
    });
    server.serverApp.post('/read/players', (request, response, next) => {
      const body = idsRequest.safeParse(request.body);
      if (!body.success) return response.sendStatus(400);
      void playerProfiles(db, body.data.ids).then(
        (rows) => response.json(rows),
        next,
      );
    });
    server.serverApp.get('/read/trainer/:id', (request, response, next) => {
      const id = accountId.safeParse(request.params.id);
      if (!id.success) return response.sendStatus(400);
      void trainerProfile(db, id.data).then(
        (profile) => response.json(profile),
        next,
      );
    });
    server.serverApp.post('/read/board', (request, response, next) => {
      const body = boardRequest.safeParse(request.body);
      if (!body.success) return response.sendStatus(400);
      const { mode, visible, day, offset, limit } = body.data;
      const ownerId = accountId.parse(response.locals.ownerId as unknown);
      void boardRows(board, mode, visible, day).then(
        (rows) =>
          response.json({
            total: rows.length,
            page: rows.slice(offset, offset + limit),
            viewer:
              rows.find((row) => row.playerId === ownerId && row.comparable) ??
              null,
          }),
        next,
      );
    });
    server.serverApp.get('/read/export', (request, response, next) => {
      const ownerId = accountId.parse(response.locals.ownerId as unknown);
      void Promise.all([
        db.players.findOne(ownerId).exec(),
        db.rounds.find({ selector: { ownerId } }).exec(),
      ]).then(
        ([player, rounds]) =>
          response.json({
            player: player
              ? {
                  id: ownerId,
                  profile: player.profile,
                  settings: player.settings,
                }
              : null,
            rounds: rounds.map((round) =>
              compactRoundSchema.parse(round.toMutableJSON()),
            ),
          }),
        next,
      );
    });
    server.serverApp.delete('/read/account', (_request, response, next) => {
      const ownerId = accountId.parse(response.locals.ownerId as unknown);
      void (async () => {
        const [rounds, player] = await Promise.all([
          db.rounds.find({ selector: { ownerId } }).exec(),
          db.players.findOne(ownerId).exec(),
        ]);
        const removed = await db.rounds.bulkRemove(rounds);
        if (removed.error.length)
          throw new Error('Could not delete account rounds.');
        await player?.remove();
        await Promise.all([db.rounds.cleanup(0), db.players.cleanup(0)]);
        await board.removeOwner(ownerId);
        response.sendStatus(204);
      })().catch(next);
    });
    Sentry.setupExpressErrorHandler(server.serverApp);
    const safeErrorResponse: ErrorRequestHandler = (
      error,
      request,
      response,
      next,
    ) => {
      if (response.headersSent) return next(error);
      response.vary('Origin');
      if (request.headers.origin === config.origin) {
        response.set('Access-Control-Allow-Origin', config.origin);
        response.set('Access-Control-Allow-Credentials', 'true');
      }
      const details =
        typeof error === 'object' && error !== null
          ? (error as { status?: unknown; statusCode?: unknown })
          : null;
      const candidate = details?.status ?? details?.statusCode;
      const status =
        typeof candidate === 'number' &&
        Number.isInteger(candidate) &&
        candidate >= 400 &&
        candidate <= 599
          ? candidate
          : 500;
      response.status(status).json({
        error:
          status < 500
            ? 'Sync request rejected.'
            : 'Sync temporarily unavailable.',
      });
    };
    server.serverApp.use(safeErrorResponse);
    await server.start();
    db.onClose.push(() => {
      board.close();
      return mongoClient.close();
    });
    return { server, db };
  } catch (error) {
    standings?.close();
    await client?.close();
    await db.close();
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mongoUrl = process.env.MONGO_URL;
  const origin = process.env.AUTH_ORIGIN;
  const audience = process.env.SYNC_AUDIENCE;
  if (!mongoUrl || !origin || !audience)
    throw new Error('MONGO_URL, AUTH_ORIGIN, and SYNC_AUDIENCE are required.');
  try {
    await startSyncServer({
      mongoUrl,
      mongoTlsCaFile: process.env.MONGO_TLS_CA_FILE,
      mongoTlsCertKeyFile: process.env.MONGO_TLS_CERT_KEY_FILE,
      origin,
      audience,
      port: Number(process.env.PORT ?? 8080),
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { 'error.kind': 'sync.startup' } });
    await Sentry.flush(2_000);
    throw error;
  }
}

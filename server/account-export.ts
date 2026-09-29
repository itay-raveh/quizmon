import type { Context } from 'hono';
import type { AccountEnv } from './api.ts';
import { readProgressExport } from './read.ts';
import { isRecord } from '../src/lib/validation.ts';
import { friendCollection } from './friends.ts';

export async function exportAccount(context: Context<AccountEnv>) {
  const db = context.get('db');
  const accountId = context.get('accountId');
  const [identity, providers, friends, progress] = await Promise.all([
    db
      .collection<{ _id: string; email: string; createdAt: Date }>('user')
      .findOne({ _id: accountId }, { projection: { email: 1, createdAt: 1 } }),
    db
      .collection('account')
      .find(
        { userId: accountId },
        { projection: { accountId: 1, providerId: 1, createdAt: 1 } },
      )
      .toArray(),
    friendCollection(db)
      .find({ $or: [{ fromId: accountId }, { toId: accountId }] })
      .toArray(),
    readProgressExport(context),
  ]);
  if (!identity || !isRecord(progress) || !Array.isArray(progress.rounds))
    throw new Error('Account export failed.');
  context.header(
    'Content-Disposition',
    'attachment; filename="quizmon-account.json"',
  );
  context.header('X-Content-Type-Options', 'nosniff');
  return context.json({
    format: 'quizmon-account-export',
    accountId,
    exportedAt: new Date().toISOString(),
    scope:
      'Server data. Unsynced changes remain on the device and are included in browser backups.',
    account: {
      id: accountId,
      email: identity.email,
      createdAt: identity.createdAt,
    },
    providers: providers.map(({ _id, ...provider }) => ({
      id: _id,
      ...provider,
    })),
    friends: friends.map((friend) => ({
      id: friend._id,
      fromId: friend.fromId,
      toId: friend.toId,
      status: friend.status,
      createdAt: friend.createdAt,
      updatedAt: friend.updatedAt,
    })),
    player: progress.player ?? null,
    rounds: progress.rounds,
    dailyReceipts: progress.dailyReceipts ?? [],
  });
}

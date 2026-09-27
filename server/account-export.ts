import { eq, or } from 'drizzle-orm';
import type { Context } from 'hono';
import type { AccountEnv } from './api.ts';
import { readProgressExport } from './read.ts';
import { isRecord } from '../src/lib/validation.ts';
import * as schema from './schema.ts';

export async function exportAccount(context: Context<AccountEnv>) {
  const db = context.get('db');
  const accountId = context.get('accountId');
  const [[identity], providers, friends, progress] = await Promise.all([
    db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, accountId)),
    db
      .select({
        id: schema.account.id,
        accountId: schema.account.accountId,
        providerId: schema.account.providerId,
        createdAt: schema.account.createdAt,
      })
      .from(schema.account)
      .where(eq(schema.account.userId, accountId)),
    db
      .select()
      .from(schema.friend)
      .where(
        or(
          eq(schema.friend.fromId, accountId),
          eq(schema.friend.toId, accountId),
        ),
      ),
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
    account: identity,
    providers,
    friends,
    player: progress.player ?? null,
    rounds: progress.rounds,
  });
}

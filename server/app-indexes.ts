import type { Db } from 'mongodb';

export async function ensureAppIndexes(db: Db) {
  await Promise.all([
    db
      .collection('user')
      .createIndex({ email: 1 }, { name: 'user_email_uidx', unique: true }),
    db
      .collection('session')
      .createIndex({ token: 1 }, { name: 'session_token_uidx', unique: true }),
    db
      .collection('session')
      .createIndex({ userId: 1 }, { name: 'session_userId_idx' }),
    db
      .collection('account')
      .createIndex({ userId: 1 }, { name: 'account_userId_idx' }),
    db
      .collection('account')
      .createIndex(
        { providerId: 1, accountId: 1 },
        { name: 'account_providerId_accountId_uidx', unique: true },
      ),
    db
      .collection('verification')
      .createIndex({ identifier: 1 }, { name: 'verification_identifier_idx' }),
    db.collection('friend').createIndex(
      { pairKey: 1 },
      {
        name: 'friend_active_pair_uidx',
        unique: true,
        partialFilterExpression: { status: { $in: ['pending', 'accepted'] } },
      },
    ),
    db
      .collection('friend')
      .createIndex(
        { fromId: 1, status: 1, _id: 1 },
        { name: 'friend_from_idx' },
      ),
    db
      .collection('friend')
      .createIndex({ toId: 1, status: 1, _id: 1 }, { name: 'friend_to_idx' }),
  ]);
}

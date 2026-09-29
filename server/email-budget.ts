import type { Db } from 'mongodb';
import { EmailDeliveryError } from './email.ts';

export const DAILY_EMAIL_LIMIT = 200;
export const CYCLE_EMAIL_LIMIT = 3_000;

export async function reserveEmail(db: Db) {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const cycle = new Date(now - 9 * 86_400_000).toISOString().slice(0, 7);
  const budget = db.collection<{
    _id: number;
    day: string;
    dayCount: number;
    cycle: string;
    cycleCount: number;
  }>('mail_budget');
  await budget.updateOne(
    { _id: 1 },
    { $setOnInsert: { day: '', dayCount: 0, cycle: '', cycleCount: 0 } },
    { upsert: true },
  );
  const reserved = await budget.findOneAndUpdate(
    {
      _id: 1,
      $and: [
        {
          $or: [
            { day: { $ne: day } },
            { dayCount: { $lt: DAILY_EMAIL_LIMIT } },
          ],
        },
        {
          $or: [
            { cycle: { $ne: cycle } },
            { cycleCount: { $lt: CYCLE_EMAIL_LIMIT } },
          ],
        },
      ],
    },
    [
      {
        $set: {
          day,
          cycle,
          dayCount: {
            $cond: [{ $eq: ['$day', day] }, { $add: ['$dayCount', 1] }, 1],
          },
          cycleCount: {
            $cond: [
              { $eq: ['$cycle', cycle] },
              { $add: ['$cycleCount', 1] },
              1,
            ],
          },
        },
      },
    ],
    { returnDocument: 'after' },
  );
  if (!reserved) throw new EmailDeliveryError(true);
}

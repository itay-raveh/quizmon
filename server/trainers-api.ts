import type { AccountEnv } from './api.ts';
import { Hono } from 'hono';
import { isAccountId } from './friends.ts';
import { readTrainer } from './target-read.ts';

export const trainerApi = new Hono<AccountEnv>();
trainerApi.get('/:id', async (context) => {
  const id = context.req.param('id');
  if (!isAccountId(id))
    return context.json({ error: 'trainer_not_found' }, 404);
  const trainer = await readTrainer(context.get('db'), id);
  return trainer
    ? context.json(trainer)
    : context.json({ error: 'trainer_not_found' }, 404);
});

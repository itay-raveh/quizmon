import game, { DailyReminder } from './game.ts';
import accounts from '../server/worker.ts';

type GameAccountEnv = Partial<AccountEnv> & Parameters<typeof game.fetch>[1];

export default {
  fetch(request: Request, env: GameAccountEnv): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (
      path.startsWith('/api/') &&
      path !== '/api/events' &&
      !path.startsWith('/api/daily-reminders/')
    )
      return accounts.fetch(request, env);
    return game.fetch(request, env);
  },
};

export { DailyReminder };

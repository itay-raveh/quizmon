import type { KVNamespace } from '@cloudflare/workers-types';

export interface SpendingEnv {
  QUIZMON_SPENDING: Pick<KVNamespace, 'get'>;
}

export async function spendingAllowed(env: SpendingEnv): Promise<boolean> {
  try {
    const lease = await env.QUIZMON_SPENDING.get<{
      enabled: boolean;
      expiresAt: number;
    }>('lease', { type: 'json', cacheTtl: 60 });
    return (
      lease?.enabled === true &&
      Number.isFinite(lease.expiresAt) &&
      lease.expiresAt > Date.now() &&
      lease.expiresAt <= Date.now() + 15 * 60_000
    );
  } catch {
    return false;
  }
}

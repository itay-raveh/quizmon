import { cloudflareBindingDelivery } from './email.ts';

import { createAccountApi } from './api.ts';
import * as Sentry from '@sentry/cloudflare';

const reportFailure = (error: unknown) => {
  try {
    Sentry.captureException(error, {
      tags: { 'error.kind': 'account.worker' },
    });
    Sentry.metrics.count('quizmon.failure', 1, {
      attributes: { 'error.kind': 'account.worker' },
    });
  } catch {
    // Monitoring must not change account responses.
  }
};

export default {
  async fetch(request: Request, env: Partial<AccountEnv>) {
    if (
      !env.ACCOUNT_DB ||
      !env.AUTH_RATE_LIMIT ||
      !env.API_RATE_LIMIT ||
      !env.BETTER_AUTH_SECRET ||
      !env.AUTH_ORIGIN ||
      !env.POWERSYNC_URL ||
      !env.POWERSYNC_AUDIENCE ||
      !env.MAIL_DELIVERY
    )
      return new Response('Account service is not configured.', {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      });
    const path = new URL(request.url).pathname;
    const limiter = path.startsWith('/api/auth/')
      ? env.AUTH_RATE_LIMIT
      : env.API_RATE_LIMIT;
    try {
      const result = await limiter.limit({
        key: request.headers.get('CF-Connecting-IP') ?? 'local',
      });
      if (!result.success)
        return new Response('Too many requests. Try again shortly.', {
          status: 429,
          headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
        });
    } catch (error) {
      reportFailure(error);
      return new Response('Service temporarily unavailable.', { status: 503 });
    }
    try {
      if (!['cloudflare', 'test-mailbox'].includes(env.MAIL_DELIVERY))
        throw new Error('Invalid mail delivery configuration.');
      if (env.MAIL_DELIVERY === 'cloudflare' && !env.EMAIL)
        throw new Error('Email binding is missing.');
      return createAccountApi({
        sync: {
          version: 1,
          endpoint: env.POWERSYNC_URL,
          audience: env.POWERSYNC_AUDIENCE,
        },
        connectionString: env.ACCOUNT_DB.connectionString,
        origin: env.AUTH_ORIGIN,
        secret: env.BETTER_AUTH_SECRET,
        mail:
          env.MAIL_DELIVERY === 'cloudflare'
            ? {
                mode: 'cloudflare',
                deliver: cloudflareBindingDelivery(
                  env.EMAIL!,
                  env.MAIL_FROM ?? '',
                ),
              }
            : { mode: 'test-mailbox' },
      }).fetch(request);
    } catch (error) {
      reportFailure(error);
      return new Response('Account service temporarily unavailable.', {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
  },
};

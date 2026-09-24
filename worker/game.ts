import {
  fetchSpriteSource,
  isSpritePath,
} from '../src/domain/pokemon/sprite-source';
import {
  DailyReminder,
  handleDailyReminderRequest,
  type DailyReminderEnv,
} from './daily-reminder';
import { noStoreResponse } from './responses';
import { isGamePath } from '../src/app/game-path';

const SPRITE_CACHE_SECONDS = 60 * 60 * 24 * 30;
interface Env extends DailyReminderEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

interface CloudflareRequestInit extends RequestInit {
  cf: {
    cacheEverything: boolean;
    cacheTtl: number;
  };
}

const fetchSprite = async (request: Request, url: URL): Promise<Response> => {
  const response = await fetchSpriteSource(url.pathname, {
    cf: {
      cacheEverything: true,
      cacheTtl: SPRITE_CACHE_SECONDS,
    },
  } as CloudflareRequestInit);

  if (!response.ok) {
    return new Response('Sprite unavailable', {
      status: response.status === 404 ? 404 : 502,
    });
  }

  const headers = {
    'Cache-Control': `public, max-age=${SPRITE_CACHE_SECONDS}, immutable`,
    'Content-Type': url.pathname.endsWith('.gif')
      ? 'image/gif'
      : url.pathname.endsWith('.svg')
        ? 'image/svg+xml'
        : 'image/png',
    'X-Content-Type-Options': 'nosniff',
  };

  return new Response(request.method === 'HEAD' ? null : response.body, {
    headers,
    status: 200,
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const dailyReminderResponse = await handleDailyReminderRequest(
      request,
      env,
      url,
    );
    if (dailyReminderResponse) return dailyReminderResponse;

    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      isSpritePath(url.pathname)
    ) {
      return fetchSprite(request, url);
    }

    if (url.pathname.startsWith('/sprites/')) {
      return noStoreResponse('Sprite unavailable', 404);
    }

    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.pathname !== '/' &&
      isGamePath(url.pathname)
    )
      return env.ASSETS.fetch(
        new Request(new URL('/index.html', url), request),
      );

    return env.ASSETS.fetch(request);
  },
};

export { DailyReminder };

import { isObject } from '../src/game/validation';
import { noStoreResponse } from './responses';
import type { GameMode } from '../src/game/types';
import { fetchSpriteSource, isSpritePath } from '../src/game/sprite-source';
import {
  DailyReminder,
  handleDailyReminderRequest,
  type DailyReminderEnv,
} from './daily-reminder';

const SPRITE_CACHE_SECONDS = 60 * 60 * 24 * 30;
const ANALYTICS_PATH = '/api/events';
const MAX_EVENT_BODY_LENGTH = 1_024;

interface AnalyticsEngineDataset {
  writeDataPoint(event: {
    blobs?: string[];
    doubles?: number[];
    indexes: string[];
  }): void;
}

interface Env extends DailyReminderEnv {
  ANALYTICS: AnalyticsEngineDataset;
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

  const headers = new Headers({
    'Cache-Control': `public, max-age=${SPRITE_CACHE_SECONDS}, immutable`,
    'Content-Type': url.pathname.endsWith('.gif')
      ? 'image/gif'
      : url.pathname.endsWith('.svg')
        ? 'image/svg+xml'
        : 'image/png',
    'X-Content-Type-Options': 'nosniff',
  });

  return new Response(request.method === 'HEAD' ? null : response.body, {
    headers,
    status: 200,
  });
};

type AnalyticsEvent =
  | { type: 'page_view' }
  | {
      mode: GameMode['kind'];
      questionCount: number;
      type: 'game_started';
    }
  | {
      contentVersion: number;
      correctCount: number;
      elapsedSeconds: number;
      mode: GameMode['kind'];
      questionCount: number;
      score: number;
      scoreVersion: number;
      type: 'game_completed';
    };

const isIntegerBetween = (
  value: unknown,
  minimum: number,
  maximum: number,
): value is number =>
  Number.isInteger(value) &&
  typeof value === 'number' &&
  value >= minimum &&
  value <= maximum;

const isGameMode = (value: unknown): value is GameMode['kind'] =>
  value === 'daily' || value === 'league' || value === 'training';

const isAnalyticsEvent = (event: unknown): event is AnalyticsEvent => {
  if (!isObject(event)) return false;

  if (event.type === 'page_view') return true;
  if (event.type === 'game_started') {
    return (
      isGameMode(event.mode) && isIntegerBetween(event.questionCount, 1, 100)
    );
  }
  return (
    event.type === 'game_completed' &&
    isGameMode(event.mode) &&
    isIntegerBetween(event.questionCount, 1, 100) &&
    isIntegerBetween(event.correctCount, 0, event.questionCount) &&
    isIntegerBetween(event.score, 0, 1_000_000_000) &&
    isIntegerBetween(event.elapsedSeconds, 0, 604_800) &&
    isIntegerBetween(event.contentVersion, 0, Number.MAX_SAFE_INTEGER) &&
    isIntegerBetween(event.scoreVersion, 1, Number.MAX_SAFE_INTEGER)
  );
};

const recordAnalyticsEvent = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  if (request.method !== 'POST') {
    return noStoreResponse('Method not allowed', 405, { Allow: 'POST' });
  }

  if (
    request.headers.get('Content-Type')?.split(';', 1)[0] !== 'application/json'
  ) {
    return noStoreResponse('Expected application/json', 415);
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_EVENT_BODY_LENGTH) {
    return noStoreResponse('Request body too large', 413);
  }

  const body = await request.text();
  if (body.length > MAX_EVENT_BODY_LENGTH) {
    return noStoreResponse('Request body too large', 413);
  }

  let event: unknown;
  try {
    event = JSON.parse(body);
  } catch {
    return noStoreResponse('Invalid event', 400);
  }

  if (!isAnalyticsEvent(event)) {
    return noStoreResponse('Invalid event', 400);
  }

  if (event.type === 'page_view') {
    env.ANALYTICS.writeDataPoint({ indexes: [event.type] });
  } else if (event.type === 'game_started') {
    env.ANALYTICS.writeDataPoint({
      blobs: [event.mode],
      doubles: [event.questionCount],
      indexes: [event.type],
    });
  } else {
    env.ANALYTICS.writeDataPoint({
      blobs: [event.mode],
      doubles: [
        event.questionCount,
        event.correctCount,
        event.score,
        event.elapsedSeconds,
        event.contentVersion,
        event.scoreVersion,
      ],
      indexes: [event.type],
    });
  }

  return noStoreResponse(null, 204);
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

    if (url.pathname === ANALYTICS_PATH) {
      return recordAnalyticsEvent(request, env);
    }

    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      isSpritePath(url.pathname)
    ) {
      return fetchSprite(request, url);
    }

    if (url.pathname.startsWith('/sprites/')) {
      return noStoreResponse('Sprite unavailable', 404);
    }

    return env.ASSETS.fetch(request);
  },
};

export { DailyReminder };

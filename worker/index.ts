const SPRITE_PATH =
  /^\/sprites\/pokemon\/(?:(?:(?:back\/|shiny\/)?[1-9]\d{0,3}|versions\/generation-(?:i|ii|iii|iv)\/(?:red-blue|crystal|firered-leafgreen|platinum)\/(?:back\/)?[1-9]\d{0,3})\.png|other\/(?:(?:home|official-artwork)\/[1-9]\d{0,3}\.png|dream-world\/[1-9]\d{0,3}\.svg|showdown\/(?:back\/)?[1-9]\d{0,3}\.gif))$/;
const SPRITE_SOURCE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
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

interface Env {
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
  const sourcePath = url.pathname.slice('/sprites'.length);
  const response = await fetch(`${SPRITE_SOURCE}${sourcePath}`, {
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

type GameMode = 'daily' | 'league' | 'training';

type AnalyticsEvent =
  | { type: 'page_view' }
  | {
      mode: GameMode;
      questionCount: number;
      type: 'game_started';
    }
  | {
      contentVersion: number;
      correctCount: number;
      elapsedSeconds: number;
      mode: GameMode;
      questionCount: number;
      score: number;
      scoreVersion: number;
      type: 'game_completed';
    };

const isIntegerBetween = (value: unknown, minimum: number, maximum: number) =>
  Number.isInteger(value) &&
  typeof value === 'number' &&
  value >= minimum &&
  value <= maximum;

const isGameMode = (value: unknown): value is GameMode =>
  value === 'daily' || value === 'league' || value === 'training';

const isAnalyticsEvent = (value: unknown): value is AnalyticsEvent => {
  if (!value || typeof value !== 'object') return false;

  const event = value as Record<string, unknown>;
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
    isIntegerBetween(event.correctCount, 0, event.questionCount as number) &&
    isIntegerBetween(event.score, 0, 1_000_000_000) &&
    isIntegerBetween(event.elapsedSeconds, 0, 604_800) &&
    isIntegerBetween(event.contentVersion, 0, Number.MAX_SAFE_INTEGER) &&
    isIntegerBetween(event.scoreVersion, 1, Number.MAX_SAFE_INTEGER)
  );
};

const noStoreHeaders = { 'Cache-Control': 'no-store' };

const recordAnalyticsEvent = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      headers: { ...noStoreHeaders, Allow: 'POST' },
      status: 405,
    });
  }

  if (
    request.headers.get('Content-Type')?.split(';', 1)[0] !== 'application/json'
  ) {
    return new Response('Expected application/json', {
      headers: noStoreHeaders,
      status: 415,
    });
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_EVENT_BODY_LENGTH) {
    return new Response('Request body too large', {
      headers: noStoreHeaders,
      status: 413,
    });
  }

  const body = await request.text();
  if (body.length > MAX_EVENT_BODY_LENGTH) {
    return new Response('Request body too large', {
      headers: noStoreHeaders,
      status: 413,
    });
  }

  let event: unknown;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid event', {
      headers: noStoreHeaders,
      status: 400,
    });
  }

  if (!isAnalyticsEvent(event)) {
    return new Response('Invalid event', {
      headers: noStoreHeaders,
      status: 400,
    });
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

  return new Response(null, { headers: noStoreHeaders, status: 204 });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === ANALYTICS_PATH) {
      return recordAnalyticsEvent(request, env);
    }

    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      SPRITE_PATH.test(url.pathname)
    ) {
      return fetchSprite(request, url);
    }

    return env.ASSETS.fetch(request);
  },
};

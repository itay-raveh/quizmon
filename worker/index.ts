const SPRITE_PATH =
  /^\/sprites\/pokemon\/(?:back\/|shiny\/)?[1-9]\d{0,3}\.png$/;
const SPRITE_SOURCE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const SPRITE_CACHE_SECONDS = 60 * 60 * 24 * 30;

interface Env {
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
    'Content-Type': 'image/png',
    'X-Content-Type-Options': 'nosniff',
  });

  return new Response(request.method === 'HEAD' ? null : response.body, {
    headers,
    status: 200,
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      SPRITE_PATH.test(url.pathname)
    ) {
      return fetchSprite(request, url);
    }

    return env.ASSETS.fetch(request);
  },
};

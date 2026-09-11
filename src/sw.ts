/// <reference lib="webworker" />

import { DAILY_REMINDER_MESSAGE } from '@/features/reminders/reminder-config';
import { spriteCachePlugin } from '@/lib/sprite-cache';
import { isObject } from '@/lib/validation';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { contentPages } from './app/content-pages';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: string[];
};

interface DailyPushPayload {
  body?: string;
  tag?: string;
  title?: string;
  url?: string;
}

const readPushPayload = (event: PushEvent): DailyPushPayload => {
  try {
    const candidate: unknown = event.data?.json();
    if (!isObject(candidate)) return {};
    return {
      body: typeof candidate.body === 'string' ? candidate.body : undefined,
      tag: typeof candidate.tag === 'string' ? candidate.tag : undefined,
      title: typeof candidate.title === 'string' ? candidate.title : undefined,
      url: typeof candidate.url === 'string' ? candidate.url : undefined,
    };
  } catch {
    return {};
  }
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(async (options) => {
    const contentPage = contentPages.find(({ path }) =>
      [path, `${path}/`, `${path}.html`].includes(options.url.pathname),
    );
    const isGame = /^\/(?:index\.html)?$/.test(options.url.pathname);
    const page = contentPage
      ? `${contentPage.path}.html`
      : isGame
        ? '/index.html'
        : '/404.html';
    const response = await createHandlerBoundToURL(page)(options);
    return page === '/404.html'
      ? new Response(response.body, { status: 404, headers: response.headers })
      : response;
  }),
);

registerRoute(
  ({ sameOrigin, url }) =>
    sameOrigin &&
    /\/assets\/build\/.*\.(?:avif|ico|mp3|png|webp)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'quizmon-static-media-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 90,
        maxEntries: 20,
      }),
    ],
  }),
);

registerRoute(
  ({ sameOrigin, url }) =>
    sameOrigin && url.pathname.startsWith('/sprites/pokemon/'),
  new CacheFirst({
    cacheName: 'quizmon-pokemon-sprites-v2',
    plugins: [
      spriteCachePlugin,
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 90,
        maxEntries: 400,
      }),
    ],
  }),
);

self.addEventListener('message', (event) => {
  const value: unknown = event.data;
  if (isObject(value) && value.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event);

  event.waitUntil(
    self.registration.showNotification(
      payload.title ?? DAILY_REMINDER_MESSAGE.title,
      {
        body: payload.body ?? DAILY_REMINDER_MESSAGE.body,
        data: { url: payload.url ?? '/' },
        icon: '/pwa-192x192.png',
        tag: payload.tag ?? DAILY_REMINDER_MESSAGE.tag,
      },
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data as { url?: string } | undefined)?.url ?? '/',
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: 'window' })
      .then(async (clients) => {
        const existing = clients.find((client) => client.url === target);
        if (existing) return existing.focus();
        return self.clients.openWindow(target);
      }),
  );
});

import { expect, test as base, type Page } from '@playwright/test';
import catalogData from '../src/game/data/pokemon.json' with { type: 'json' };

export { catalogData, expect };
const imageBody = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export const formatName = (name: string) =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const seedBrowserRandom = (page: Page, seed: string) =>
  page.addInitScript((value) => {
    Date.now = () => 1_700_000_000_000;
    let hash = 2166136261;
    for (const character of value) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    let state = hash >>> 0;
    Math.random = () => {
      state += 0x6d2b79f5;
      let next = state;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);

export const test = base.extend({
  page: async ({ page }, run) => {
    await page.addInitScript(() => {
      if (window.location.search.includes('fresh=1')) return;
      window.localStorage.setItem(
        'quizmon.training-settings.v2',
        JSON.stringify({
          generations: ['I'],
          questionTypes: ['pokedex-scan'],
          soundEnabled: false,
          limit: 1,
          speedrunMode: true,
        }),
      );
    });

    await page.route('**/sprites/pokemon/**', async (route) => {
      await route.fulfill({ contentType: 'image/png', body: imageBody });
    });

    await run(page);
  },
});

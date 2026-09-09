import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test as base, type Page } from '@playwright/test';
import catalogData from '../src/game/data/pokemon.json' with { type: 'json' };
import type { PokemonCatalog } from '../src/game/types';

export { catalogData, expect };
export const catalog = catalogData as unknown as PokemonCatalog;
const imageBody = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export const formatName = (name: string) =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const findPokemonByLabel = (label: string | null) =>
  Object.entries(catalogData.pokemon).find(
    ([name]) => formatName(name) === label,
  )?.[1];

const seedrandomScript = readFileSync(
  createRequire(import.meta.url).resolve('seedrandom/seedrandom.min.js'),
  'utf8',
);

export const seedBrowserRandom = (page: Page, seed: string) =>
  page.addInitScript({
    content: `${seedrandomScript}
      Date.now = () => 1_700_000_000_000;
      Math.random = Math.seedrandom(${JSON.stringify(seed)}, { global: false });`,
  });

export const completeTrainingRound = async (page: Page) => {
  const progress = page.getByRole('progressbar', { name: 'Quiz progress' });

  for (let number = 1; number <= 10; number += 1) {
    await expect(progress).toHaveText(
      `${String(number).padStart(3, '0')} / 010`,
    );
    await page.locator('.answer:not(:disabled)').first().click();
  }

  await expect(
    page.getByRole('heading', { name: 'Training complete' }),
  ).toBeVisible();
};

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
          speedrunMode: true,
          trainingMode: 'custom',
        }),
      );
    });

    await page.route('**/sprites/pokemon/**', async (route) => {
      await route.fulfill({ contentType: 'image/png', body: imageBody });
    });

    await run(page);
  },
});

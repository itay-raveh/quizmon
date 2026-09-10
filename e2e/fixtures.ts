import { defaultModifiers } from '../src/game/modifiers';
import type { TrainerProgressChange } from '../src/game/trainer';
import { readFileSync } from 'node:fs';
import { expect, test as base, type Page } from '@playwright/test';
import catalogData from '../src/game/data/pokemon.json' with { type: 'json' };
import type {
  Generation,
  PokemonCatalog,
  QuestionType,
} from '../src/game/types';

export { catalogData, expect };
export const catalog = catalogData as unknown as PokemonCatalog;
const imageBody = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export { formatPokemonName as formatName } from '../src/game/format';
import { formatPokemonName as formatName } from '../src/game/format';

export const findPokemonByLabel = (label: string | null) =>
  Object.entries(catalogData.pokemon).find(
    ([name]) => formatName(name) === label,
  )?.[1];

const seedrandomScript = readFileSync(
  new URL(import.meta.resolve('seedrandom/seedrandom.min.js')),
  'utf8',
);

export const seedBrowserRandom = (page: Page, seed: string) =>
  page.addInitScript({
    content: `${seedrandomScript}
      Date.now = () => 1_700_000_000_000;
      Math.random = Math.seedrandom(${JSON.stringify(seed)}, { global: false });`,
  });

export const seedQuestionTraining = (
  page: Page,
  questionType: QuestionType,
  generations: readonly Generation[] = ['I'],
) =>
  page.addInitScript(
    ({ questionType, generations }) => {
      window.localStorage.setItem(
        'quizmon.training-settings.v2',
        JSON.stringify({
          generations,
          questionTypes: [questionType],
          trainingMode: 'custom',
          soundEnabled: false,
          speedrunMode: false,
        }),
      );
    },
    { questionType, generations },
  );

export const seedLeagueResults = (
  page: Page,
  progressChanges: TrainerProgressChange[] = [],
) =>
  page.addInitScript(
    ({ modifiers, progressChanges }) => {
      const result = {
        answers: Array.from({ length: 9 }, (_, index) => ({
          category: 'identity',
          cluesUsed: 0,
          correct: index < 8,
          generation: 'I',
          pokemonName: 'pikachu',
          points: index < 8 ? 1000 : 0,
          questionType: 'pokedex-scan',
          speedBonus: index < 8 ? 1500 : 0,
        })),
        contentVersion: 5,
        correctCount: 8,
        elapsedSeconds: 34,
        questionCount: 15,
        score: 29791,
        scoreVersion: 2,
      };
      sessionStorage.setItem(
        'quizmon.update-state.v1',
        JSON.stringify({
          url: location.href,
          values: {
            session: {
              phase: 'results',
              mode: { kind: 'league' },
              modifiers,
              result,
              bestResult: result,
              resultSaved: true,
              isNewBest: false,
              progressChanges,
              seed: 'league-results-layout',
            },
          },
        }),
      );
    },
    {
      modifiers: { ...defaultModifiers, reduceMotion: true, soundVolume: 0 },
      progressChanges,
    },
  );

export const expectNoHorizontalOverflow = async (page: Page) => {
  const { pageWidth, viewportWidth } = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(pageWidth).toBeLessThanOrEqual(viewportWidth);
};

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

import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { TrainerProgressChange } from '../src/domain/player/trainer-progression';
import catalogData from '../src/domain/pokemon/data/pokemon.json' with { type: 'json' };
import { formatPokemonName as formatName } from '../src/domain/pokemon/format';
import type { Generation, PokemonCatalog } from '../src/domain/pokemon/types';
import type { QuestionType } from '../src/domain/quiz/types';
import { defaultGameSettings } from '../src/domain/settings/game-settings';

export { catalogData, expect };
export const catalog = catalogData as unknown as PokemonCatalog;
const imageBody = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export { formatPokemonName as formatName } from '../src/domain/pokemon/format';

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
    ({ settings, progressChanges }) => {
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
              settings,
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
      settings: { ...defaultGameSettings, reduceMotion: true, soundVolume: 0 },
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

export const advanceToDailyFinale = async (page: Page) => {
  for (let index = 0; index < 4; index += 1) {
    await page.locator('.answer').first().click();
    const check = page.getByRole('button', {
      name: 'Check answers',
      exact: true,
    });
    if (await check.count()) await check.click();
    await page
      .getByRole('button', { name: 'Next question', exact: true })
      .click();
  }
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

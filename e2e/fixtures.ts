import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import catalogData from '../src/domain/pokemon/data/pokemon.json' with { type: 'json' };
import { formatPokemonName as formatName } from '../src/domain/pokemon/format';
import type { Generation, PokemonCatalog } from '../src/domain/pokemon/types';
import type { ActiveGameSnapshot } from '../src/lib/storage/active-game-storage';
import type { QuestionType } from '../src/domain/quiz/types';

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
    ({ questionType, generations, difficulty }) => {
      window.localStorage.setItem(
        'quizmon.training-settings.v2',
        JSON.stringify({
          difficulty,
          questionSelection: 'custom',
          generations,
          questionTypes: [questionType],
          trainingMode: 'custom',
          soundEnabled: false,
          speedrunMode: false,
        }),
      );
    },
    {
      questionType,
      generations,
      difficulty:
        (
          {
            'pokedex-scan': 4,
            'sprite-match': 3,
            'silhouette-match': 4,
            'whos-that-pokemon': 3,
            'pixel-peek': 4,
            'shiny-spotter': 4,
            'field-notes': 2,
            'type-check': 2,
            'type-matchup': 4,
            'counter-pick': 4,
            'stat-showdown': 4,
            'move-check': 4,
          } as Partial<Record<QuestionType, number>>
        )[questionType] ?? 3,
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
    await answerCurrentQuestion(page);
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

export const answerCurrentQuestion = async (page: Page) => {
  const search = page.getByRole('combobox', { name: 'Your answer' });
  await expect(page.locator('.answer').or(search).first()).toBeVisible();
  if (await search.count()) {
    const name = await page.evaluate(() => {
      const snapshot = JSON.parse(
        sessionStorage.getItem('quizmon.active-game.v1')!,
      ) as ActiveGameSnapshot;
      return snapshot.questions[snapshot.answers.length]!.answer
        .correctOptions[0] as string;
    });
    await search.fill(formatName(name));
    await page.getByRole('button', { name: 'Guess', exact: true }).click();
  } else {
    await page.locator('.answer').first().click();
    const check = page.getByRole('button', {
      name: 'Check answers',
      exact: true,
    });
    if (await check.count()) await check.click();
  }
};

export const chooseDaily = async (page: Page) => {
  await page.getByRole('button', { name: /^Play Daily Challenge/ }).click();
};

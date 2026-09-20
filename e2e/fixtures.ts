import {
  SAVE_SCHEMA_VERSION,
  emptyPlayerData,
  type PlayerData,
} from '../src/domain/player/player-save';
import { defaultGameSettings } from '../src/domain/settings/game-settings';
import type { GameSettings } from '../src/domain/settings/types';
export { formatPokemonName as formatName } from '../src/domain/pokemon/format';
import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import catalogData from '../src/domain/pokemon/data/pokemon.json' with { type: 'json' };
import { catalog } from '../tests/fixtures/catalog';
import { formatPokemonName as formatName } from '../src/domain/pokemon/format';
import type { Generation } from '../src/domain/pokemon/types';
import type { QuestionType } from '../src/domain/quiz/types';
import { readRound } from './database-fixture';
import { installDatabaseFixture } from './database-fixture';

export { catalog, catalogData, expect };
const imageBody = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

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

type PlayerFixture = Omit<Partial<PlayerData>, 'settings' | 'results'> & {
  settings?: Partial<GameSettings>;
  results?: Omit<Partial<PlayerData['results']>, 'progress'> & {
    progress?: Partial<PlayerData['results']['progress']>;
  };
};
const trainingFixture: GameSettings = {
  ...defaultGameSettings,
  difficulty: 3,
  questionSelection: 'custom',
  generations: ['I'],
  questionTypes: ['pokedex-scan'],
  soundVolume: 0,
  answerFlow: 'instant',
  trainingMode: 'custom',
};
let fixtureNumber = 0;
export const seedPlayer = (page: Page, patch: PlayerFixture) =>
  page.addInitScript(
    ({ patch, initial, marker }) => {
      if (sessionStorage.getItem(marker)) return;
      const raw = localStorage.getItem('quizmon.player');
      const save = raw ? (JSON.parse(raw) as typeof initial) : initial;
      const results = patch.results;
      save.data = {
        ...save.data,
        ...patch,
        settings: { ...save.data.settings, ...patch.settings },
        results: {
          ...save.data.results,
          ...results,
          progress: { ...save.data.results.progress, ...results?.progress },
        },
      };
      localStorage.setItem('quizmon.player', JSON.stringify(save));
      sessionStorage.setItem(marker, '1');
    },
    {
      patch,
      initial: {
        version: SAVE_SCHEMA_VERSION,
        restoreId: null,
        data: { ...emptyPlayerData(), settings: trainingFixture },
      },
      marker: 'quizmon.test-seed.' + fixtureNumber++,
    },
  );
export const seedQuestionTraining = (
  page: Page,
  questionType: QuestionType,
  generations: readonly Generation[] = ['I'],
) =>
  seedPlayer(page, {
    settings: {
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
          } as Partial<Record<QuestionType, GameSettings['difficulty']>>
        )[questionType] ?? 3,
      questionSelection: 'custom',
      generations: [...generations],
      questionTypes: [questionType],
      trainingMode: 'custom',
      soundVolume: 0,
      answerFlow: 'manual',
    },
  });

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
  page: async ({ page, baseURL }, run) => {
    await installDatabaseFixture(page, baseURL);
    await page.addInitScript(
      (initial) => {
        if (
          location.search.includes('fresh=1') ||
          localStorage.getItem('quizmon.player')
        )
          return;
        localStorage.setItem('quizmon.player', JSON.stringify(initial));
      },
      {
        version: SAVE_SCHEMA_VERSION,
        restoreId: null,
        data: { ...emptyPlayerData(), settings: trainingFixture },
      },
    );

    await page.route('**/sprites/pokemon/**', async (route) => {
      await route.fulfill({ contentType: 'image/png', body: imageBody });
    });

    await run(page);
  },
});

export const answerCurrentQuestion = async (page: Page) => {
  const answers = page.locator('.answer:not(:disabled)');
  const search = page.getByRole('combobox', { name: 'Your answer' });
  const types = page.getByRole('combobox', { name: 'Your types' });
  await expect(answers.or(search).or(types).first()).toBeVisible();
  if (await types.count()) {
    await types.fill('bug');
    await types.press('Enter');
    await page
      .getByRole('button', { name: 'Check answers', exact: true })
      .click();
  } else if (await search.count()) {
    const snapshot = (await readRound(page))!;
    const name =
      snapshot.questions[snapshot.answers.length]!.answer.correctOptions[0]!;
    await search.fill(formatName(name));
    await page.getByRole('button', { name: 'Guess', exact: true }).click();
  } else {
    await answers.first().click();
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

import { completion } from '../tests/online/progress-fixtures';
import { seedPlayer } from './fixtures';
import type { PlayerSave } from '../src/domain/player/player-save';
import { formGroups, generations } from '../src/domain/pokemon/types';
import {
  buildDailyTrackQuestions,
  resolveTrainingSettings,
} from '../src/domain/quiz/question-generation';
import { defaultGameSettings } from '../src/domain/settings/game-settings';
import { readRound, readSave, writeSave } from './database-fixture';
import {
  advanceToDailyFinale,
  catalog,
  chooseDaily,
  expect,
  seedBrowserRandom,
  test,
} from './fixtures';
test('keeps completed Daily results shareable without granting another attempt', async ({
  page,
}) => {
  const result = completion(crypto.randomUUID(), 'daily', {
    dailyDate: '2026-09-01',
  }).result;
  await seedPlayer(page, {
    results: {
      daily: {
        '2026-09-01:3:all': {
          ...result,
          dailyTrack: { difficulty: 3, scope: 'all' },
        },
      },
      streak: { creditedDates: ['2026-09-01'] },
      training: {},
    },
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        window.sessionStorage.setItem(
          'quizmon.test-share',
          JSON.stringify(data),
        );
        return Promise.resolve();
      },
    });
  });
  await page.goto('/?daily=2026-09-01');
  await expect(
    page.getByRole('button', { name: 'Share result' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Share result' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const data = window.sessionStorage.getItem('quizmon.test-share');
        return data ? (JSON.parse(data) as ShareData).text : undefined;
      }),
    )
    .toContain('https://quizmon.raveh.dev/?daily=2026-09-01');
  const sharedText = await page.evaluate(() => {
    const data = window.sessionStorage.getItem('quizmon.test-share');
    return data ? (JSON.parse(data) as ShareData).text : undefined;
  });
  const sharedUrl = sharedText?.split('\n').at(-1);
  expect(sharedUrl).toBe('https://quizmon.raveh.dev/?daily=2026-09-01');
  const { pathname, search } = new URL(sharedUrl!);
  await page.goto(`${pathname}${search}`);
  await expect(
    page.getByRole('button', { name: 'Share result' }),
  ).toBeVisible();
});
test('starts the selected daily challenge from a shared link', async ({
  page,
}) => {
  await page.goto('/?daily=2026-09-01');
  await chooseDaily(page);
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 005');
  await expect(page.getByText('Daily Challenge · Sep 1, 2026')).toBeVisible();
});
test("shows yesterday's Daily Combo on today's challenge", async ({ page }) => {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const date = yesterday.toISOString().slice(0, 10);

  await page.setViewportSize({ width: 320, height: 700 });
  await seedPlayer(page, {
    results: {
      daily: {
        [`${date}:3:all`]: {
          ...completion(crypto.randomUUID(), 'daily', { dailyDate: date })
            .result,
          dailyTrack: { difficulty: 3, scope: 'all' },
        },
      },
      streak: { creditedDates: [date] },
      training: {},
    },
  });
  await page.goto('/');
  await expect(
    page.getByRole('img', { name: '1-day Daily Combo' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: /Play Daily Challenge.*1-day Daily Combo/,
    }),
  ).toBeVisible();
});
test('syncs a completed daily across open tabs', async ({ context, page }) => {
  const otherPage = await context.newPage();
  await Promise.all([
    page.goto('/?daily=2026-09-01'),
    otherPage.goto('/?daily=2026-09-01'),
  ]);
  await expect(
    otherPage.getByRole('button', { name: /^Play Daily Challenge/ }),
  ).toBeVisible();

  const save = await readSave(page);
  save.data.results.daily['2026-09-01:3:all'] = {
    ...completion(crypto.randomUUID(), 'daily', { dailyDate: '2026-09-01' })
      .result,
    dailyTrack: { difficulty: 3, scope: 'all' },
  };
  await writeSave(page, save);

  await expect(
    otherPage.getByRole('button', { name: 'Share result' }),
  ).toBeVisible();
  await expect(
    otherPage.getByRole('button', { name: /^Play Daily Challenge/ }),
  ).toHaveCount(0);
});
test('starts saved Training settings directly after completing Daily', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await seedPlayer(page, {
    settings: {
      generations: ['I'],
      questionTypes: ['pokedex-scan'],
      trainingMode: 'custom',
      answerFlow: 'manual',
      soundVolume: 0,
    },
  });
  await page.goto('/?daily=2026-09-01');
  await chooseDaily(page);
  await advanceToDailyFinale(page);
  await page.getByRole('button', { name: /^Show 4 choices/ }).click();
  await page.locator('.answer').first().click();
  await page.getByRole('button', { name: 'See results', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Daily complete', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Share result' }),
  ).toBeVisible();
  const savedDaily = await readSave(page).then((saved) =>
    saved ? JSON.stringify(saved) : null,
  );
  expect(savedDaily).not.toBeNull();
  await page
    .getByRole('button', { name: 'Start training', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Pokédex scan', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 010');
  const beforeTraining = JSON.parse(savedDaily!) as PlayerSave;
  const readCurrentSave = () =>
    readSave(page).then(
      (saved) =>
        JSON.parse((saved ? JSON.stringify(saved) : null)!) as PlayerSave,
    );
  await expect
    .poll(async () => (await readCurrentSave()).data.questionHistory.sequence)
    .toBe(beforeTraining.data.questionHistory.sequence + 1);
  const afterTraining = await readCurrentSave();
  expect({
    ...afterTraining,
    data: {
      ...afterTraining.data,
      questionHistory: beforeTraining.data.questionHistory,
    },
  }).toEqual(beforeTraining);
});
for (const tag of [[], ['@cross-browser']]) {
  test(
    `generates the same complete Daily in the browser and Node ${tag.join(' ')}`,
    { tag },
    async ({ page }) => {
      const date = '2026-09-08';
      const settings = resolveTrainingSettings(catalog, {
        ...defaultGameSettings,
        difficulty: 3,
        generations: [...generations],
        formGroups: [...formGroups],
      });
      const expected = buildDailyTrackQuestions(catalog, date, settings, 'all');
      await seedBrowserRandom(page, 'unrelated-browser-randomness');
      await page.goto(`/?daily=${date}`);
      await chooseDaily(page);
      await expect(page.locator('.question')).toBeVisible();
      expect((await readRound(page))?.questions).toEqual(expected);
    },
  );
}
test('play links enter Daily without a setup screen', async ({ page }) => {
  await page.goto('/?daily=2026-09-01&play=1');
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 005', { timeout: 15_000 });
  await expect(page.locator('.daily-menu')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Start Daily', exact: true }),
  ).toHaveCount(0);
});

import { expect, test } from './fixtures';

test('shows a saved daily score instead of another play button', async ({
  page,
}) => {
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
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {
          '2026-09-01': {
            answers: Array.from({ length: 10 }, (_, index) => ({
              category: index === 9 ? 'champion' : 'identity',
              correct: index < 8,
              points: index < 8 ? 1_000 : 0,
            })),
            contentVersion: 2,
            correctCount: 8,
            elapsedSeconds: 90,
            questionCount: 10,
            score: 14_400,
            scoreVersion: 2,
          },
        },
        streak: { creditedDates: ['2026-09-01'], version: 1 },
        training: {},
      }),
    );
  });

  await page.goto('/?daily=2026-09-01');
  await expect(page.getByText('Share result')).toBeVisible();
  await expect(page.getByText('14,400 points')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: /Share result.*14,400 points/ })
    .click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const data = window.sessionStorage.getItem('quizmon.test-share');
        return data ? (JSON.parse(data) as ShareData).text : undefined;
      }),
    )
    .toContain('https://quizmon.raveh.dev/?daily=2026-09-01&play=1');

  const sharedText = await page.evaluate(() => {
    const data = window.sessionStorage.getItem('quizmon.test-share');
    return data ? (JSON.parse(data) as ShareData).text : undefined;
  });
  const sharedUrl = sharedText?.split('\n').at(-1);
  expect(sharedUrl).toBe('https://quizmon.raveh.dev/?daily=2026-09-01&play=1');
  const { pathname, search } = new URL(sharedUrl!);
  await page.goto(`${pathname}${search}`);
  await expect(page.getByText('14,400 points')).toBeVisible();
});

test('starts the selected daily challenge from a shared link', async ({
  page,
}) => {
  await page.goto('/?daily=2026-09-01&play=1');

  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 005');
  await expect(page.getByText('Daily Challenge · Sep 1, 2026')).toBeVisible();
});

test("shows yesterday's Daily Combo on today's challenge", async ({ page }) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = [
    yesterday.getFullYear(),
    yesterday.getMonth() + 1,
    yesterday.getDate(),
  ]
    .map((part, index) => part.toString().padStart(index === 0 ? 4 : 2, '0'))
    .join('-');

  await page.setViewportSize({ width: 320, height: 700 });

  await page.addInitScript(
    ({ dailyDate }) => {
      window.localStorage.setItem(
        'quizmon.results.v2',
        JSON.stringify({
          daily: {
            [dailyDate]: {
              answers: [],
              contentVersion: 2,
              correctCount: 0,
              elapsedSeconds: 10,
              questionCount: 5,
              score: 0,
              scoreVersion: 2,
            },
          },
          streak: { creditedDates: [dailyDate], version: 1 },
          training: {},
        }),
      );
    },
    { dailyDate: date },
  );

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
    otherPage.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toBeVisible();

  await page.evaluate(() => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {
          '2026-09-01': {
            answers: Array.from({ length: 10 }, (_, index) => ({
              category: index === 9 ? 'champion' : 'identity',
              correct: true,
              points: 100,
            })),
            contentVersion: 2,
            correctCount: 10,
            elapsedSeconds: 70,
            questionCount: 10,
            score: 1000,
          },
        },
        training: {},
      }),
    );
  });

  await expect(otherPage.getByText('Share result')).toBeVisible();
  await expect(
    otherPage.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toHaveCount(0);
});

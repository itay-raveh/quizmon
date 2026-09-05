import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures';

test('customizes, exports, shares, and turns the Trainer Card', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {},
        progress: {
          championAnswersWithoutClues: 0,
          correctCategories: { type: 10 },
          correctGenerations: {},
          correctPokemon: [],
          correctQuestionTypes: {},
          masteryRounds: 0,
          quickAttackCompleted: false,
          version: 2,
        },
        streak: { creditedDates: [], version: 1 },
        training: {},
      }),
    );
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Trainer Card' }).click();
  await expect(page).toHaveURL(/\?trainer=front$/);
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Edit card' }).click();
  await page.getByRole('textbox', { name: 'Trainer name' }).fill('Leaf');
  await page.getByRole('combobox', { name: 'Partner Pokémon' }).fill('Pikachu');
  await page.getByRole('option', { name: 'Pikachu' }).click();
  await page
    .getByLabel('Trainer title')
    .selectOption({ label: 'Type Specialist' });
  await page.getByRole('button', { name: 'Save card' }).click();

  const card = page.getByRole('article', { name: 'Trainer Card front' });
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await expect(card.locator('.trainer-card__partner-caption')).toHaveText(
    'No. 0025Pikachu',
  );
  await expect(page.getByText('Type Specialist')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const downloadPath = await (await downloadPromise).path();
  const png = await readFile(downloadPath);
  expect(png.subarray(1, 4).toString()).toBe('PNG');

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: ({ files }: ShareData) => Boolean(files?.length),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        Object.assign(window, { sharedTrainerCardUrl: data.url });
        return Promise.resolve();
      },
    });
  });
  await page.reload();

  const shareButton = page.getByRole('button', { name: 'Share card' });
  await shareButton.click();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { sharedTrainerCardUrl?: string })
          .sharedTrainerCardUrl,
    ),
  ).toBe('https://quizmon.raveh.dev/?trainer=front');

  await page.getByRole('button', { name: 'View badges' }).click();
  await expect(page).toHaveURL(/\?trainer=back$/);
  const badgeCase = page.getByRole('article', {
    name: 'Trainer Card badge case',
  });
  await expect(badgeCase).toBeVisible();
  await shareButton.click();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { sharedTrainerCardUrl?: string })
          .sharedTrainerCardUrl,
    ),
  ).toBe('https://quizmon.raveh.dev/?trainer=back');

  await expect(badgeCase.getByText('0 / 8')).toBeVisible();
  await badgeCase.getByRole('button', { name: /Many Paths\. Locked/ }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Many Paths' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog').getByText('0 / 10')).toBeVisible();
  await page.getByRole('button', { name: 'Close badge details' }).click();

  await page.reload();
  await expect(badgeCase).toBeVisible();
  await page.getByRole('button', { name: 'View front' }).click();
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL('/');
});

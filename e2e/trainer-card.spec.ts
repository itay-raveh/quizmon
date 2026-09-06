import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures';

test('customizes and shares the Trainer Card collections', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Trainer profile' }).click();
  await expect(page).toHaveURL(/\?trainer=card$/);
  await expect(
    page.getByRole('article', { name: 'Trainer Card' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Titles', exact: true }).click();
  const initialTitles = page.getByRole('article', {
    name: 'Trainer Titles collection',
  });
  await initialTitles
    .getByRole('button', { name: /Type Specialist.*Earned/ })
    .click();
  await page.getByRole('button', { name: 'Equip title' }).click();
  await page.getByRole('button', { name: 'Card', exact: true }).click();

  await page.getByRole('button', { name: 'Edit card' }).click();
  await expect(page.getByLabel('Trainer title')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Trainer name' }).fill('Leaf');
  await page.getByRole('combobox', { name: 'Partner Pokémon' }).fill('Pikachu');
  await page.getByRole('option', { name: 'Pikachu' }).click();
  await page.getByRole('button', { name: 'Save card' }).click();

  const card = page.getByRole('article', { name: 'Trainer Card' });
  await expect(card.getByText('Play at')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await expect(card.locator('.trainer-card__partner-caption')).toHaveText(
    'No. 0025Pikachu',
  );
  await expect(
    page.getByText('Type Specialist', { exact: true }),
  ).toBeVisible();
  await expect(
    card.locator('.trainer-card__title .trainer-title-mark'),
  ).toBeVisible();

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
        Object.assign(window, {
          sharedTrainerArtifact: {
            hasUrl: 'url' in data,
            text: data.text,
          },
        });
        return Promise.resolve();
      },
    });
  });
  await page.reload();

  await page.getByRole('button', { name: 'Share card' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              sharedTrainerArtifact?: { hasUrl: boolean; text?: string };
            }
          ).sharedTrainerArtifact,
      ),
    )
    .toEqual({
      hasUrl: false,
      text: 'My Quizmon Trainer Card\nhttps://quizmon.raveh.dev/',
    });

  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(page).toHaveURL(/\?trainer=badges$/);
  const badgeCase = page.getByRole('article', {
    name: 'League Badge Case',
  });
  await expect(badgeCase).toBeVisible();
  await expect(badgeCase.getByText('Play at')).toHaveCount(0);
  await page.getByRole('button', { name: 'Share case' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              sharedTrainerArtifact?: { hasUrl: boolean; text?: string };
            }
          ).sharedTrainerArtifact,
      ),
    )
    .toEqual({
      hasUrl: false,
      text: 'My Quizmon League Badge Case\nhttps://quizmon.raveh.dev/',
    });

  await expect(badgeCase.getByText('0 / 8', { exact: true })).toHaveCount(0);
  await badgeCase.getByRole('button', { name: /Many Paths\. Locked/ }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Many Paths' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog').getByText('0 / 10')).toBeVisible();
  await page.getByRole('button', { name: 'Close badge details' }).click();

  await page.getByRole('button', { name: 'Titles', exact: true }).click();
  await expect(page).toHaveURL(/\?trainer=titles$/);
  const titles = page.getByRole('article', {
    name: 'Trainer Titles collection',
  });
  await expect(titles).toBeVisible();
  await expect(titles.getByText('Play at')).toHaveCount(0);
  await expect(titles.getByText('Trainer Titles')).toHaveCount(0);
  await expect(titles.getByText(/lifetime/i)).toHaveCount(0);
  await expect(titles.getByText('1 / 8 earned', { exact: true })).toHaveCount(
    0,
  );
  const equippedTitle = titles.getByRole('button', {
    name: /Type Specialist.*Equipped/,
  });
  await expect(equippedTitle).toBeVisible();
  await equippedTitle.click();
  await expect(
    page.getByRole('button', { name: 'Unequip title' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close title details' }).click();
  await titles.getByRole('button', { name: /Ability Specialist/ }).click();
  const titleDialog = page.getByRole('dialog');
  await expect(
    titleDialog.getByRole('heading', { name: 'Ability Specialist' }),
  ).toBeVisible();
  await expect(
    titleDialog.getByText('Know which abilities a Pokémon can have.'),
  ).toBeVisible();
  await expect(
    titleDialog.getByText('Answer 10 questions correctly in this field.'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Close title details' }).click();
  await page.getByRole('button', { name: 'Share titles' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              sharedTrainerArtifact?: { hasUrl: boolean; text?: string };
            }
          ).sharedTrainerArtifact,
      ),
    )
    .toEqual({
      hasUrl: false,
      text: 'My Quizmon Trainer Titles\nhttps://quizmon.raveh.dev/',
    });

  await page.reload();
  await expect(titles).toBeVisible();

  await page.getByRole('button', { name: 'Card', exact: true }).click();
  await expect(page).toHaveURL(/\?trainer=card$/);
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL('/');
});

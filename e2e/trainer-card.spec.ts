import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures';

test('keeps a customizable two-sided Trainer Card on this device', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {},
        progress: {
          categories: {},
          gamesCompleted: 1,
          perfectRounds: 0,
          version: 1,
        },
        streak: { creditedDates: [], version: 1 },
        training: {},
      }),
    );
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Trainer Card' }).click();

  await expect(page).toHaveURL(/\?trainer=1$/);
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toBeVisible();
  await expect(page.getByText('Your profile')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Copy Quizmon link' }),
  ).toHaveCount(0);
  const backWidth = await page
    .getByRole('button', { name: 'Back' })
    .evaluate((button) => button.getBoundingClientRect().width);
  expect(backWidth).toBeLessThanOrEqual(48);
  const editButton = page.getByRole('button', { name: 'Edit card' });
  await expect(editButton.locator('svg')).toHaveCount(1);
  await editButton.click();
  await page.getByRole('textbox', { name: 'Trainer name' }).fill('Leaf');
  await page.getByRole('combobox', { name: 'Partner Pokémon' }).fill('Pikachu');
  await expect(
    page.getByRole('option', { name: 'Pikachu' }).locator('img'),
  ).toHaveAttribute('src', '/sprites/pokemon/25.png');
  await page.getByRole('option', { name: 'Pikachu' }).click();
  const violetAccent = page.getByRole('radio', { name: 'Violet' });
  await page.getByText('Violet', { exact: true }).click();
  await expect(violetAccent).toBeChecked();
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toHaveClass(/trainer-card--accent-violet/);
  await page.getByRole('button', { name: 'Save card' }).click();

  const card = page.getByRole('article', { name: 'Trainer Card front' });
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await expect(page.getByText('Pikachu')).toBeVisible();
  await expect(page.getByText('No. 0025')).toBeVisible();
  await expect(card.getByText('ID No.')).toBeVisible();
  await expect(card.getByText('Play at')).toBeVisible();
  await expect(card.getByText('quizmon.raveh.dev')).toBeVisible();
  await expect(card.getByText(/finish/i)).toHaveCount(0);
  const downloadButton = page.getByRole('button', { name: 'Download PNG' });
  await expect(downloadButton).toBeEnabled();
  await expect(downloadButton.locator('svg')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Share card' })).toHaveCount(0);
  const cardBounds = await card.boundingBox();
  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!cardBounds) throw new Error('Trainer Card bounds are unavailable');
  const png = await readFile(downloadPath);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(Math.abs(png.readUInt32BE(16) - cardBounds.width * 2)).toBeLessThan(4);

  await page.setViewportSize({ width: 360, height: 800 });
  const mobileFrontBounds = await card.boundingBox();
  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopFrontBounds = await card.boundingBox();
  if (!mobileFrontBounds || !desktopFrontBounds) {
    throw new Error('Responsive Trainer Card bounds are unavailable');
  }
  const mobileFrontRatio = mobileFrontBounds.width / mobileFrontBounds.height;
  const desktopFrontRatio =
    desktopFrontBounds.width / desktopFrontBounds.height;
  expect(mobileFrontRatio).toBeCloseTo(1.5, 1);
  expect(desktopFrontRatio).toBeCloseTo(1.5, 1);
  expect(Math.abs(desktopFrontRatio - mobileFrontRatio)).toBeLessThanOrEqual(
    0.05,
  );
  const portraitRatio = await card
    .locator('.trainer-card__portrait')
    .evaluate((portrait) => {
      const bounds = portrait.getBoundingClientRect();
      return bounds.width / bounds.height;
    });
  expect(portraitRatio).toBeCloseTo(1, 1);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: ({ files }: ShareData) => Boolean(files?.length),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => Promise.resolve(),
    });
  });
  await page.reload();
  const shareButton = page.getByRole('button', { name: 'Share card' });
  await expect(shareButton).toBeEnabled();
  await expect(shareButton.locator('svg')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Download PNG' })).toHaveCount(
    0,
  );
  await shareButton.click();
  await expect(page.getByText('Trainer Card shared.')).toHaveClass(
    'visually-hidden',
  );
  await page.getByRole('button', { name: 'View records' }).click();
  await expect(
    page.getByRole('article', { name: 'Trainer Card records' }),
  ).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toHaveCount(0);
  await expect(page.locator('.trainer-passport__card')).toHaveClass(
    /trainer-passport__card--idle/,
  );
  const recordsCard = page.getByRole('article', {
    name: 'Trainer Card records',
  });
  await expect(page.getByRole('heading', { name: 'Stamp case' })).toBeVisible();
  await expect(page.getByText('1 / 5 earned')).toBeVisible();
  await expect(
    recordsCard.getByRole('img', { name: /Well Rounded: locked/ }),
  ).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  const mobileRecordsBounds = await recordsCard.boundingBox();
  const firstCatchBounds = await recordsCard
    .getByText('First Catch')
    .evaluate((label) => {
      const cardBounds = label
        .closest('.trainer-card')
        ?.getBoundingClientRect();
      const labelBounds = label.getBoundingClientRect();
      const stampBounds = label
        .closest('.trainer-stamp')
        ?.getBoundingClientRect();
      if (!cardBounds || !stampBounds) {
        throw new Error('Trainer Card stamp bounds are unavailable');
      }
      return {
        bottom: labelBounds.bottom,
        cardBottom: cardBounds.bottom,
        stampBottom: stampBounds.bottom,
        stampTop: stampBounds.top,
        top: labelBounds.top,
      };
    });
  expect(firstCatchBounds.top).toBeGreaterThanOrEqual(
    firstCatchBounds.stampTop,
  );
  expect(firstCatchBounds.bottom).toBeLessThanOrEqual(
    firstCatchBounds.stampBottom,
  );
  expect(firstCatchBounds.cardBottom - firstCatchBounds.bottom).toBeGreaterThan(
    4,
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopRecordsBounds = await recordsCard.boundingBox();
  if (!mobileRecordsBounds || !desktopRecordsBounds) {
    throw new Error('Responsive Trainer Card record bounds are unavailable');
  }
  expect(mobileRecordsBounds.width / mobileRecordsBounds.height).toBeCloseTo(
    1.5,
    1,
  );
  expect(desktopRecordsBounds.width / desktopRecordsBounds.height).toBeCloseTo(
    1.5,
    1,
  );

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL('/');
  const settingsButton = page.getByRole('button', { name: 'Settings' });
  const trainerButton = page.getByRole('button', { name: 'Trainer Card' });
  const trainingButton = page.getByRole('button', { name: 'Start training' });
  await expect(trainerButton.locator('img')).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 720 });
  const controlStyles = await Promise.all(
    [settingsButton, trainerButton, trainingButton].map((button) =>
      button.evaluate((element) => {
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          height: bounds.height,
          top: bounds.top,
        };
      }),
    ),
  );
  expect(controlStyles[0]).toEqual(controlStyles[1]);
  expect(controlStyles[1]).toEqual(controlStyles[2]);
  await page.setViewportSize({ width: 768, height: 900 });
  const intermediateFontSize = await trainerButton.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  );
  expect(intermediateFontSize).toBeGreaterThanOrEqual(14);
});

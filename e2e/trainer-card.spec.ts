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
  await page
    .getByLabel('Trainer title')
    .selectOption({ label: 'Type Specialist' });
  await expect(page.getByText('Accent color')).toHaveCount(0);
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toHaveClass(/trainer-card--classic/);
  await page.getByRole('button', { name: 'Save card' }).click();

  const card = page.getByRole('article', { name: 'Trainer Card front' });
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await expect(page.getByText('Pikachu')).toBeVisible();
  await expect(page.getByText('No. 0025')).toBeVisible();
  await expect(card.locator('.trainer-card__partner-caption')).toHaveText(
    'No. 0025Pikachu',
  );
  await expect(page.getByText('Type Specialist')).toBeVisible();
  await expect(card.getByText('ID No.')).toHaveCount(0);
  await expect(card.getByText('Play at')).toBeVisible();
  await expect(card.getByText('quizmon.raveh.dev')).toBeVisible();
  await expect(card.getByText(/finish/i)).toHaveCount(0);
  await expect(card.locator('.trainer-card__portrait')).toHaveCSS(
    'background-image',
    'none',
  );
  await expect(card.locator('.trainer-card__portrait')).toHaveCSS(
    'box-shadow',
    'none',
  );
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
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  const mobileContentBounds = await card.evaluate((element) => {
    const partner = element
      .querySelector('.trainer-card__partner')
      ?.getBoundingClientRect();
    const identity = element
      .querySelector('.trainer-card__identity')
      ?.getBoundingClientRect();
    const footer = element
      .querySelector('.trainer-card__footer')
      ?.getBoundingClientRect();
    const portrait = element
      .querySelector('.trainer-card__portrait')
      ?.getBoundingClientRect();
    if (!partner || !identity || !footer || !portrait) {
      throw new Error('Trainer Card content bounds are unavailable');
    }
    return {
      cardWidth: element.getBoundingClientRect().width,
      footerTop: footer.top,
      identityBottom: identity.bottom,
      partnerBottom: partner.bottom,
      partnerHeight: partner.height,
      portraitHeight: portrait.height,
    };
  });
  expect(
    mobileContentBounds.partnerBottom,
    JSON.stringify(mobileContentBounds),
  ).toBeLessThanOrEqual(mobileContentBounds.footerTop);
  expect(mobileContentBounds.identityBottom).toBeLessThanOrEqual(
    mobileContentBounds.footerTop,
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '100%';
  });
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
      value: (data: ShareData) => {
        Object.assign(window, { sharedTrainerCardUrl: data.url });
        return Promise.resolve();
      },
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
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { sharedTrainerCardUrl?: string })
          .sharedTrainerCardUrl,
    ),
  ).toBe('https://quizmon.raveh.dev/?trainer=front');
  await expect(page.getByText('Trainer Card shared.')).toHaveClass(
    'visually-hidden',
  );
  await page.getByRole('button', { name: 'View badges' }).click();
  await expect(page).toHaveURL(/\?trainer=back$/);
  await expect(
    page.getByRole('article', { name: 'Trainer Card badge case' }),
  ).toBeVisible();
  await expect(shareButton).toBeEnabled();
  await shareButton.click();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { sharedTrainerCardUrl?: string })
          .sharedTrainerCardUrl,
    ),
  ).toBe('https://quizmon.raveh.dev/?trainer=back');
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toHaveCount(0);
  await expect(page.locator('.trainer-passport__card')).toHaveClass(
    /trainer-passport__card--idle/,
  );
  const badgeCaseCard = page.getByRole('article', {
    name: 'Trainer Card badge case',
  });
  await expect(badgeCaseCard.getByText('League Badge Case')).toBeVisible();
  await expect(badgeCaseCard.getByText('0 / 8')).toBeVisible();
  await expect(
    badgeCaseCard.getByRole('button', { name: /Many Paths\. Locked/ }),
  ).toBeVisible();
  await badgeCaseCard
    .getByRole('button', { name: /Many Paths\. Locked/ })
    .click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Many Paths' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog').getByText('0 / 10')).toBeVisible();
  await page.getByRole('button', { name: 'Close badge details' }).click();
  await page.setViewportSize({ width: 360, height: 800 });
  const mobileBadgeCaseBounds = await badgeCaseCard.boundingBox();
  const firstBadgeBounds = await badgeCaseCard
    .getByRole('button', { name: /Perfect Form/ })
    .evaluate((stamp) => {
      const cardBounds = stamp
        .closest('.trainer-card')
        ?.getBoundingClientRect();
      const stampBounds = stamp.getBoundingClientRect();
      if (!cardBounds) {
        throw new Error('Trainer Card badge bounds are unavailable');
      }
      return {
        cardBottom: cardBounds.bottom,
        stampBottom: stampBounds.bottom,
        stampTop: stampBounds.top,
      };
    });
  expect(
    firstBadgeBounds.cardBottom - firstBadgeBounds.stampBottom,
  ).toBeGreaterThan(4);
  const mobileBadgeTops = await badgeCaseCard
    .locator('.trainer-badge > .trainer-badge-mark')
    .evaluateAll((badges) =>
      badges.map((badge) => badge.getBoundingClientRect().top),
    );
  expect(
    Math.max(...mobileBadgeTops) - Math.min(...mobileBadgeTops),
  ).toBeGreaterThan(40);
  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopBadgeCaseBounds = await badgeCaseCard.boundingBox();
  if (!mobileBadgeCaseBounds || !desktopBadgeCaseBounds) {
    throw new Error('Responsive Trainer Card badge bounds are unavailable');
  }
  expect(
    mobileBadgeCaseBounds.width / mobileBadgeCaseBounds.height,
  ).toBeCloseTo(1.5, 1);
  expect(
    desktopBadgeCaseBounds.width / desktopBadgeCaseBounds.height,
  ).toBeCloseTo(1.5, 1);

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

test('opens a back-face link by turning the card from its front', async ({
  page,
}) => {
  await page.goto('/?trainer=back');

  await expect(page).toHaveURL(/\?trainer=back$/);
  await expect(page.locator('.trainer-passport__card')).toHaveClass(
    /trainer-passport__card--out/,
  );
  await expect(
    page.getByRole('article', { name: 'Trainer Card badge case' }),
  ).toBeVisible();
  await expect(page.locator('.trainer-passport__card')).toHaveClass(
    /trainer-passport__card--idle/,
  );

  await page.getByRole('button', { name: 'View front' }).click();
  await expect(page).toHaveURL(/\?trainer=front$/);
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toBeVisible();
});

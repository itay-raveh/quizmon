import { expect, seedBrowserRandom, test } from './fixtures';

test.use({ viewport: { width: 360, height: 720 } });

test('matches the mobile landing and Settings layouts', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toBeEnabled();
  await expect(page.locator('.app--landing')).toHaveScreenshot(
    'landing-mobile.webp',
    { animations: 'disabled' },
  );

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveScreenshot(
    'settings-mobile.webp',
    { animations: 'disabled' },
  );
});

test('matches the desktop landing layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toBeEnabled();
  await expect(page.locator('.app--landing')).toHaveScreenshot(
    'landing-desktop.webp',
    { animations: 'disabled' },
  );
});

test('matches the compact question layout', async ({ page }) => {
  await seedBrowserRandom(page, 'visual-baseline');
  await page.goto('/');
  await page.getByRole('button', { name: 'Start training' }).click();

  const question = page.locator('.question');
  await expect(question).toBeVisible();
  await expect(question).toHaveScreenshot('question-mobile.webp', {
    animations: 'disabled',
    mask: [page.locator('.timer')],
    maskColor: '#0d6be6',
  });
});

test('matches the Trainer Card at both responsive sizes', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.trainer-profile.v1',
      JSON.stringify({
        cardNumber: 'QZ-025151',
        createdAt: '2026-09-01',
        hasBeenRevealed: true,
        name: 'Leaf',
        partnerPokemon: 'pikachu',
        specialty: null,
        version: 1,
      }),
    );
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Trainer Card' }).click();

  const card = page.getByRole('article', { name: 'Trainer Card front' });
  await expect(card).toHaveScreenshot('trainer-card-mobile.webp', {
    animations: 'disabled',
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(card).toHaveScreenshot('trainer-card-desktop.webp', {
    animations: 'disabled',
  });
});

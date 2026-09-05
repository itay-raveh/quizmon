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

test('balances the completed Daily action and combo', async ({ page }) => {
  await page.addInitScript(() => {
    const today = new Date();
    const creditedDates = Array.from({ length: 4 }, (_, index) => {
      const creditedDate = new Date(today);
      creditedDate.setUTCDate(today.getUTCDate() - index);
      return creditedDate.toISOString().slice(0, 10);
    });

    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: Object.fromEntries(
          creditedDates.map((creditedDate) => [
            creditedDate,
            {
              answers: Array.from({ length: 5 }, (_, index) => ({
                category: index === 4 ? 'champion' : 'identity',
                correct: index < 4,
                points: index < 4 ? 1_000 : 0,
              })),
              contentVersion: 2,
              correctCount: 4,
              elapsedSeconds: 42,
              questionCount: 5,
              score: 14_920,
              scoreVersion: 2,
            },
          ]),
        ),
        streak: { creditedDates, version: 1 },
        training: {},
      }),
    );
  });

  await page.goto('/');
  await expect(
    page.getByRole('button', { name: /Share result.*14,920 points/ }),
  ).toBeVisible();
  await expect(page.locator('.app--landing')).toHaveScreenshot(
    'daily-result-combo-mobile.webp',
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

test('matches the mobile Trainer Card', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.trainer-profile.v1',
      JSON.stringify({
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
});

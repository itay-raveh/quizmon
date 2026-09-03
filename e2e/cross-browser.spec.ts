import { expect, test } from './fixtures';

test(
  'opens the primary controls',
  { tag: '@cross-browser' },
  async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /Play Daily Challenge/ }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  },
);

test(
  'completes a Training round',
  { tag: '@cross-browser' },
  async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start training' }).click();
    await expect(page.locator('.question')).toBeVisible();
    await page.locator('.answer').first().click();
    await expect(
      page.getByRole('heading', { name: 'Training complete' }),
    ).toBeVisible();
  },
);

test(
  'opens and turns the Trainer Card',
  { tag: '@cross-browser' },
  async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Trainer Card' }).click();
    await expect(
      page.getByRole('article', { name: 'Trainer Card front' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'View records' }).click();
    await expect(
      page.getByRole('article', { name: 'Trainer Card records' }),
    ).toBeVisible();
  },
);

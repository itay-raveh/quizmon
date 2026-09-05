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
  'answers a Training question',
  { tag: '@cross-browser' },
  async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start training' }).click();
    await expect(page.locator('.question')).toBeVisible();
    await page.locator('.answer').first().click();
    await expect(
      page.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toHaveText('002 / 010');
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
    await page.getByRole('button', { name: 'View badges' }).click();
    await expect(
      page.getByRole('article', { name: 'Trainer Card badge case' }),
    ).toBeVisible();
  },
);

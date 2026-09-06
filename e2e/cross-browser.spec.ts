import { expect, test } from './fixtures';

test(
  'supports the primary journey',
  { tag: '@cross-browser' },
  async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /Play Daily Challenge/ }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Trainer profile' }).click();
    await expect(
      page.getByRole('article', { name: 'Trainer Card' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Badges', exact: true }).click();
    await expect(
      page.getByRole('article', { name: 'League Badge Case' }),
    ).toBeVisible();

    await page.goto('/');
    await page.getByRole('button', { name: 'Start training' }).click();
    await expect(page.locator('.question')).toBeVisible();
    await page.locator('.answer').first().click();
    await expect(
      page.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toHaveText('002 / 010');
  },
);

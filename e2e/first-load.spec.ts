import { expect, test } from '@playwright/test';

test('shows the landing UI while saved progress opens', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/build/initialize-game-*.js', async (route) => {
    await held;
    await route.continue();
  });

  await page.goto('/');
  await expect(page.getByRole('img', { name: /Quizmon/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start training' }),
  ).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText(
    'Preparing Daily Challenge…',
  );
  const before = await page.locator('.logo').boundingBox();

  release();
  await expect(
    page.getByRole('button', { name: 'Start training' }),
  ).toBeEnabled();
  expect(await page.locator('.logo').boundingBox()).toEqual(before);
});

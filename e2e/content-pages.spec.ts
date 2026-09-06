import { expect, test } from '@playwright/test';

test('public information is readable and linked without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 288, height: 780 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/about');
  await expect(
    page.getByRole('heading', { name: 'About & How to Play', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Daily Challenge', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://quizmon.raveh.dev/about',
  );
  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Privacy and Cookies', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Terms', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Terms of Use', exact: true }),
  ).toBeVisible();
  await context.close();
});

test('offline navigation preserves content pages, game links, and missing-page status', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  await context.setOffline(true);
  for (const path of [
    '/about',
    '/about/?source=test',
    '/about.html',
    '/privacy',
    '/terms',
  ]) {
    await page.goto(path);
    await expect(page.locator('.legal-content h1')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Back to Quizmon', exact: true }),
    ).toHaveAttribute('href', '/');
  }
  const missing = await page.goto('/missing-page');
  expect(missing?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { name: 'Page not found', exact: true }),
  ).toBeVisible();
  await page.goto('/?trainer=card');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(
    page.getByRole('heading', { name: 'Page not found', exact: true }),
  ).toHaveCount(0);
});

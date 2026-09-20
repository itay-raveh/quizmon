import { expect, test } from '@playwright/test';

test('public information is readable and linked without JavaScript', async ({
  baseURL,
  browser,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 288, height: 780 },
  });
  const page = await context.newPage();
  await page.goto('/about');
  await expect(
    page.getByRole('heading', { name: 'How to play', exact: true }),
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
  await expect(
    page.locator('link[rel="alternate"][type="text/markdown"]'),
  ).toHaveAttribute('href', 'https://quizmon.raveh.dev/index.md');
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

test('information pages keep distinct metadata and canonical URLs with query parameters', async ({
  page,
}) => {
  const descriptions = new Set<string>();
  for (const path of ['/about', '/privacy', '/terms']) {
    await page.goto(`${path}?ref=share`);
    await expect(page.locator('title')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(description).toBeTruthy();
    descriptions.add(description ?? '');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://quizmon.raveh.dev${path}`,
    );
  }
  expect(descriptions.size).toBe(3);
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
  await expect(page).toHaveTitle('Page Not Found | Quizmon');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await page.goto('/?trainer=card');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(
    page.getByRole('heading', { name: 'Page not found', exact: true }),
  ).toHaveCount(0);
});

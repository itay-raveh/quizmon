import { expect, test } from './fixtures';

test('serves usable homepage metadata and discovery files', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute('content');
  expect(image).toBeTruthy();
  await expect(await page.request.get(image!)).toBeOK();

  const structuredDataText = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  const structuredData: unknown = JSON.parse(structuredDataText ?? '');
  expect(structuredData).toMatchObject({ '@context': 'https://schema.org' });

  for (const path of [
    '/site.webmanifest',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/index.md',
  ]) {
    await expect(await page.request.get(path)).toBeOK();
  }
});

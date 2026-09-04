import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures';

test('publishes complete, non-duplicated site metadata', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle(
    'Quizmon: The Ultimate Pokémon Knowledge Test',
  );
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText(
    'Quizmon: The Ultimate Pokémon Knowledge Test',
  );
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://quizmon.raveh.dev/',
  );
  await expect(
    page.locator('link[rel="alternate"][type="text/markdown"]'),
  ).toHaveAttribute('href', 'https://quizmon.raveh.dev/index.md');
  await expect(page.locator('link[rel="describedby"]')).toHaveAttribute(
    'href',
    'https://quizmon.raveh.dev/llms.txt',
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Quizmon: The Ultimate Pokémon Knowledge Test',
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://quizmon.raveh.dev/assets/images/social-card.png',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  await expect(page.locator('meta[name^="twitter:"]')).toHaveCount(1);

  const documentResponse = await page.request.get('/');
  expect(await documentResponse.text()).toContain(
    '<div id="root"><h1 id="landing-title" class="visually-hidden">Quizmon: The Ultimate Pokémon Knowledge Test</h1></div>',
  );

  const faviconResponse = await page.request.get('/favicon.ico');
  expect(faviconResponse.ok()).toBe(true);
  expect(faviconResponse.headers()['content-type']).toContain('image/x-icon');

  const socialImageResponse = await page.request.get(
    '/assets/images/social-card.png',
  );
  expect(socialImageResponse.ok()).toBe(true);
  expect((await socialImageResponse.body()).byteLength).toBeLessThan(500_000);

  const footerMetrics = await page
    .getByRole('contentinfo')
    .evaluate((footer) => ({
      fontSize: Number.parseFloat(getComputedStyle(footer).fontSize),
      linkHeights: [...footer.querySelectorAll('a')].map(
        (link) => link.getBoundingClientRect().height,
      ),
      lineCenters: [...footer.children]
        .filter((child) => !child.classList.contains('visually-hidden'))
        .map((child) => {
          const bounds = child.getBoundingClientRect();
          return Math.round(bounds.top + bounds.height / 2);
        }),
    }));
  expect(footerMetrics.fontSize).toBeGreaterThanOrEqual(14);
  expect(footerMetrics.linkHeights.every((height) => height >= 44)).toBe(true);
  expect(new Set(footerMetrics.lineCenters).size).toBe(1);

  const structuredData: unknown = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      '{}',
  );
  expect(structuredData).toMatchObject({
    '@type': ['VideoGame', 'WebApplication'],
    name: 'Quizmon',
    url: 'https://quizmon.raveh.dev/',
    applicationCategory: 'GameApplication',
    isAccessibleForFree: true,
    offers: { price: 0 },
  });

  const manifestResponse = await page.request.get('/site.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()['content-type']).toContain(
    'application/manifest+json',
  );
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: 'Quizmon',
    description:
      'Take the five-question Pokémon Daily Challenge each day, then practice types, moves, evolutions, stats, and more.',
    display: 'standalone',
    icons: [
      {
        purpose: 'any',
        sizes: '192x192',
        src: '/pwa-192x192.png',
      },
      {
        purpose: 'any',
        sizes: '512x512',
        src: '/pwa-512x512.png',
      },
      {
        purpose: 'maskable',
        sizes: '512x512',
        src: '/pwa-maskable-512x512.png',
      },
    ],
    theme_color: '#72c3ee',
  });

  const serviceWorkerResponse = await page.request.get('/sw.js');
  expect(serviceWorkerResponse.ok()).toBe(true);
  const serviceWorker = await serviceWorkerResponse.text();
  expect(serviceWorker).toContain('quizmon-pokemon-sprites');
  expect(serviceWorker).toContain('quizmon-static-media');
  expect(serviceWorker).toContain('pokemon-');
  expect(serviceWorker).not.toMatch(/assets\/build\/(?:background|wordmark)-/);

  const robotsResponse = await page.request.get('/robots.txt');
  expect(robotsResponse.ok()).toBe(true);
  expect(await robotsResponse.text()).toBe(
    'User-agent: *\nAllow: /\n\nSitemap: https://quizmon.raveh.dev/sitemap.xml\n',
  );

  const sitemapResponse = await page.request.get('/sitemap.xml');
  expect(sitemapResponse.ok()).toBe(true);
  expect(await sitemapResponse.text()).toContain(
    '<loc>https://quizmon.raveh.dev/</loc>',
  );

  const llmsResponse = await page.request.get('/llms.txt');
  expect(llmsResponse.ok()).toBe(true);
  expect(await llmsResponse.text()).toContain(
    '[Quizmon overview](https://quizmon.raveh.dev/index.md)',
  );

  const markdownResponse = await page.request.get('/index.md');
  expect(markdownResponse.ok()).toBe(true);
  const readme = await readFile(
    new URL('../README.md', import.meta.url),
    'utf8',
  );
  expect(await markdownResponse.text()).toBe(readme);
});

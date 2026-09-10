import { completeTrainingRound, expect, test } from './fixtures';

test('coffee support stays outside gameplay and sends no requests until clicked', async ({
  page,
  context,
}) => {
  const requests: { url: string; referer: string | undefined }[] = [];
  await context.route('https://buymeacoffee.com/**', async (route) => {
    requests.push({
      url: route.request().url(),
      referer: route.request().headers().referer,
    });
    await route.fulfill({
      contentType: 'text/html',
      body: '<title>Support</title>',
    });
  });

  await page.goto('/');
  const support = page.getByRole('link', { name: 'Buy me a coffee' });
  await expect(support).toBeVisible();
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(support).toHaveCount(0);
  await completeTrainingRound(page);
  await expect(support).toBeVisible();
  expect(requests).toEqual([]);
  expect(await context.cookies('https://buymeacoffee.com')).toEqual([]);

  await page.evaluate(() => {
    window.history.replaceState(
      null,
      '',
      '/results?private=do-not-share#private',
    );
  });
  const origin = new URL(page.url()).origin;
  const popupPromise = page.waitForEvent('popup');
  await support.click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(requests).toEqual([
    { url: 'https://buymeacoffee.com/itay_raveh', referer: `${origin}/` },
  ]);
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
});

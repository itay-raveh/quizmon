import { expect, test } from './fixtures';

test('loads the installed app shell and catalog offline', async ({
  context,
  page,
}) => {
  await page.goto('/');

  const serviceWorkerUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });
  expect(serviceWorkerUrl).toBe('http://127.0.0.1:4173/sw.js');

  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Quizmon' })).toBeVisible();
    const dailyChallenge = page.getByRole('button', {
      name: /Play Daily Challenge/,
    });
    await expect(dailyChallenge).toBeEnabled();
    await expect(dailyChallenge).not.toContainText('5 questions');
  } finally {
    await context.setOffline(false);
  }
});

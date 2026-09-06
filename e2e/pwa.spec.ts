import { createServer, type ServerResponse } from 'node:http';
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
  expect(serviceWorkerUrl).toBe(new URL('/sw.js', page.url()).href);

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

test('acknowledges an update immediately while the old worker finishes a request', async ({
  baseURL,
  page,
}) => {
  let version = 1;
  const pendingRequest = Promise.withResolvers<ServerResponse>();
  const server = createServer((request, response) => {
    if (request.url === '/sprites/pokemon/pwa-update.png') {
      pendingRequest.resolve(response);
      return;
    }
    void (async () => {
      try {
        const upstream = await fetch(new URL(request.url ?? '/', baseURL));
        response.setHeader(
          'Content-Type',
          upstream.headers.get('content-type') ?? 'application/octet-stream',
        );
        response.setHeader('Cache-Control', 'no-store');
        response.statusCode = upstream.status;
        const body = Buffer.from(await upstream.arrayBuffer());
        response.end(
          request.url === '/sw.js'
            ? Buffer.concat([body, Buffer.from(`\n/* update ${version} */`)])
            : body,
        );
      } catch {
        response.writeHead(502).end();
      }
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');

  try {
    await page.unroute('**/sprites/pokemon/**');
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);

    await page.evaluate(() => {
      sessionStorage.setItem('pwa-update-test', 'preserved');
      void fetch('/sprites/pokemon/pwa-update.png');
    });
    const pending = await pendingRequest.promise;
    version = 2;
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    });

    const update = page.getByRole('button', { name: 'Update now' });
    await expect(update).toBeVisible();
    await update.click();
    await expect(
      page.getByRole('button', { name: 'Updating…' }),
    ).toBeDisabled();

    const reloaded = page.waitForEvent('load');
    pending.writeHead(404).end();
    await reloaded;
    await expect(page.getByRole('button', { name: 'Update now' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('heading', { name: 'Quizmon' })).toBeVisible();
    expect(
      await page.evaluate(() => sessionStorage.getItem('pwa-update-test')),
    ).toBe('preserved');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

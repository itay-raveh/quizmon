import { createServer, type ServerResponse } from 'node:http';
import { installDatabaseFixture, readSave } from './database-fixture';
import { completeTrainingRound, expect, test } from './fixtures';

const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5xkAAAAASUVORK5CYII=',
  'base64',
);

test('caches item PNGs for offline use without caching missing item responses', async ({
  baseURL,
  context,
  page,
}) => {
  let itemRequests = 0;
  const server = createServer((request, response) => {
    if (request.url === '/sprites/items/poke-ball.png') {
      itemRequests++;
      response.writeHead(200, { 'Content-Type': 'image/png' }).end(image);
      return;
    }
    if (request.url === '/sprites/items/missing-item.png') {
      response.writeHead(404, { 'Content-Type': 'text/html' }).end('Missing');
      return;
    }
    void (async () => {
      try {
        const upstream = await fetch(new URL(request.url ?? '/', baseURL));
        response
          .writeHead(upstream.status, {
            'Content-Type':
              upstream.headers.get('content-type') ??
              'application/octet-stream',
          })
          .end(Buffer.from(await upstream.arrayBuffer()));
      } catch {
        response.writeHead(502).end();
      }
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');
  try {
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await expect(
      page.getByRole('button', { name: 'Start training', exact: true }),
    ).toBeEnabled();
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        async () => (await fetch('/sprites/items/poke-ball.png')).status,
      ),
    ).toBe(200);
    expect(
      await page.evaluate(
        async () => (await fetch('/sprites/items/missing-item.png')).status,
      ),
    ).toBe(404);
    await expect
      .poll(() =>
        page.evaluate(async () =>
          Boolean(await caches.match('/sprites/items/poke-ball.png')),
        ),
      )
      .toBe(true);
    expect(
      await page.evaluate(async () =>
        Boolean(await caches.match('/sprites/items/missing-item.png')),
      ),
    ).toBe(false);
    await context.setOffline(true);
    expect(
      await page.evaluate(async () => {
        const response = await fetch('/sprites/items/poke-ball.png');
        return {
          status: response.status,
          type: response.headers.get('content-type'),
          length: (await response.arrayBuffer()).byteLength,
        };
      }),
    ).toEqual({ status: 200, type: 'image/png', length: image.length });
    expect(itemRequests).toBe(1);
  } finally {
    await context.setOffline(false);
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

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

test('defers an update through gameplay and restores results after automatic reload', async ({
  baseURL,
  page,
}) => {
  test.setTimeout(60_000);
  let version = 1;
  const pendingRequest = Promise.withResolvers<ServerResponse>();
  const server = createServer((request, response) => {
    if (request.url === '/sprites/pokemon/pwa-update.png') {
      pendingRequest.resolve(response);
      return;
    }
    // Service-worker requests need sprite fixtures at the server boundary.
    if (request.url?.startsWith('/sprites/pokemon/')) {
      response.writeHead(200, { 'Content-Type': 'image/png' }).end(image);
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
    const origin = `http://127.0.0.1:${address.port}/`;
    await installDatabaseFixture(page, origin);
    await page.unroute('**/sprites/pokemon/**');
    await page.goto(origin);
    await expect(
      page.getByRole('button', { name: 'Start training', exact: true }),
    ).toBeEnabled();
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
    await page.getByRole('button', { name: 'Start training' }).click();
    version = 2;
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    });

    await expect
      .poll(() =>
        page.evaluate(async () =>
          Boolean((await navigator.serviceWorker.ready).waiting),
        ),
      )
      .toBe(true);
    await expect(page.getByRole('button', { name: 'Update now' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toBeVisible();
    await completeTrainingRound(page);
    const savedBefore = await readSave(page).then((saved) =>
      saved ? JSON.stringify(saved) : null,
    );

    expect(savedBefore).not.toBeNull();
    const reloaded = page.waitForEvent('load');
    pending.writeHead(404).end();
    await reloaded;
    await expect(page.getByRole('button', { name: 'Update now' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('heading', { name: 'Training complete' }),
    ).toBeVisible();
    expect(
      await readSave(page).then((saved) =>
        saved ? JSON.stringify(saved) : null,
      ),
    ).toBe(savedBefore);
    expect(
      await page.evaluate(() => sessionStorage.getItem('pwa-update-test')),
    ).toBe('preserved');

    await page.getByRole('button', { name: 'Back to start' }).click();
    await page
      .getByRole('button', { name: 'Customize training', exact: true })
      .click();
    const settings = page.getByRole('dialog', { name: 'Customize training' });
    await settings
      .getByRole('button', { name: 'Select all generations' })
      .click();
    version = 3;
    const settingsReloaded = page.waitForEvent('load');
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.ready).update();
    });
    await settingsReloaded;
    await expect(settings).toBeVisible();
    await expect(settings.getByLabel('IX', { exact: true })).toBeChecked();
    await settings.getByRole('button', { name: 'Save settings' }).click();

    await page
      .getByRole('navigation', { name: 'Main', exact: true })
      .getByRole('button', { name: 'Trainer', exact: true })
      .click();
    await page.getByRole('button', { name: 'Edit card' }).click();
    await page.getByRole('textbox', { name: 'Trainer name' }).fill('Leaf');
    await page.getByRole('combobox', { name: 'Partner Pokémon' }).fill('pika');
    version = 4;
    const trainerReloaded = page.waitForEvent('load');
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.ready).update();
    });
    await trainerReloaded;
    await expect(
      page.getByRole('textbox', { name: 'Trainer name' }),
    ).toHaveValue('Leaf');
    await expect(
      page.getByRole('combobox', { name: 'Partner Pokémon' }),
    ).toHaveValue('pika');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

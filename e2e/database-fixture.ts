import type { ActiveGameSnapshot } from '../src/lib/storage/active-game-storage';

import type { Page } from '@playwright/test';

import type { PlayerSave } from '../src/domain/player/player-save';

import { readFile } from 'node:fs/promises';

interface DatabaseFixture {
  body: string;
  worker: string;
  entry: string;
  files: Record<string, string>;
}
let driver: Promise<DatabaseFixture>;
const prepare = () =>
  (driver ??= readFile(process.env.QUIZMON_E2E_DATABASE_FIXTURE!, 'utf8').then(
    (text) => JSON.parse(text) as DatabaseFixture,
  ));

export const installDatabaseFixture = async (
  page: Page,
  baseURL: string | undefined,
) => {
  if (!baseURL) throw new Error('The database fixture requires a base URL.');
  const origin = new URL(baseURL).origin;
  const { body, files, worker, entry } = await prepare();
  await page.context().route(`${origin}/__quizmon_fixture/**`, (route) => {
    const path = new URL(route.request().url()).pathname.slice(1);
    const data = files[path];
    if (!data) throw new Error(`Missing fixture asset: ${path}`);
    return route.fulfill({
      contentType: path.endsWith('.wasm')
        ? 'application/wasm'
        : 'text/javascript',
      body: Buffer.from(data, 'base64'),
    });
  });
  await page
    .context()
    .route(`${origin}/__quizmon_database_fixture.js`, (route) =>
      route.fulfill({ contentType: 'text/javascript', body }),
    );
  await page.context().route(`${origin}${entry}`, async (route) => {
    if (route.request().serviceWorker()) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `await import('/__quizmon_database_fixture.js').then(driver => driver.open(${JSON.stringify(worker)}, true));\n${await response.text()}`,
    });
  });
};
export const readSave = async (page: Page): Promise<PlayerSave> => {
  const { worker } = await prepare();
  return page.evaluate(async (worker) => {
    const driver = (await import(
      `${location.origin}/__quizmon_database_fixture.js`
    )) as typeof import('./database-driver');
    await driver.open(worker);
    return driver.readSave();
  }, worker);
};
export const writeSave = async (page: Page, save: PlayerSave) => {
  const { worker } = await prepare();
  await page.evaluate(
    async ({ worker, save }) => {
      const driver = (await import(
        `${location.origin}/__quizmon_database_fixture.js`
      )) as typeof import('./database-driver');
      await driver.open(worker);
      await driver.writeSave(save);
    },
    { worker, save },
  );
};
export const readRound = async (
  page: Page,
): Promise<ActiveGameSnapshot | null> => {
  const { worker } = await prepare();
  return page.evaluate(async (worker) => {
    const driver = (await import(
      `${location.origin}/__quizmon_database_fixture.js`
    )) as typeof import('./database-driver');
    await driver.open(worker);
    return driver.readRound();
  }, worker);
};

export const readRawPlayer = async (page: Page): Promise<string> => {
  const { worker } = await prepare();
  return page.evaluate(async (worker) => {
    const driver = (await import(
      `${location.origin}/__quizmon_database_fixture.js`
    )) as typeof import('./database-driver');
    await driver.open(worker);
    return driver.readRawPlayer();
  }, worker);
};

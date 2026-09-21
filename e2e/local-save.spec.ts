import {
  emptyPlayerData,
  SAVE_SCHEMA_VERSION,
} from '../src/domain/player/player-save';
import { installDatabaseFixture, readRound } from './database-fixture';
import { defaultGameSettings } from '../src/domain/settings/game-settings';
import { test as base, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { preview } from 'vite';
import type { PlayerBackup } from '../src/features/settings/backup';
import { getDailyResultKey } from '../src/domain/quiz/daily-track';
import type { Action, RoundCompletion } from '../src/domain/sync/progress';

const test = base.extend<{
  origin: {
    url: string;
    start: () => Promise<void>;
    stop: () => Promise<void>;
  };
}>({
  origin: async ({ browserName }, run) => {
    const { body, files } = JSON.parse(
      await readFile(process.env.QUIZMON_E2E_DATABASE_FIXTURE!, 'utf8'),
    ) as { body: string; files: Record<string, string> };
    const headerBlock = (await readFile('public/_headers', 'utf8')).split(
      '\n\n',
    )[0]!;
    const headers = Object.fromEntries(
      [...headerBlock.matchAll(/^ {2}([^:]+): (.+)$/gm)].map(
        ([, name, value]) => [name!, value!],
      ),
    );
    // WebKit upgrades loopback HTTP, but this preview has no TLS endpoint.
    // https://bugs.webkit.org/show_bug.cgi?id=250776
    headers['Content-Security-Policy'] = headers[
      'Content-Security-Policy'
    ]!.split(';')
      .filter((directive) => directive.trim() !== 'upgrade-insecure-requests')
      .join(';');
    const { httpServer } = await preview({
      configFile: false,
      logLevel: 'silent',
      plugins: [
        {
          name: 'quizmon-e2e-database-fixture',
          configurePreviewServer(server) {
            server.middlewares.use((request, response, next) => {
              const path = new URL(
                request.url ?? '/',
                'http://localhost',
              ).pathname.slice(1);
              const data =
                path === '__quizmon_database_fixture.js'
                  ? Buffer.from(body)
                  : files[path]
                    ? Buffer.from(files[path], 'base64')
                    : null;
              if (!data) return next();
              response.setHeader(
                'Content-Type',
                path.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
              );
              response.end(data);
            });
          },
        },
      ],
      build: { outDir: process.env.QUIZMON_E2E_DIST_DIR ?? 'dist' },
      preview: { host: '127.0.0.1', port: 0, headers },
    });
    const address = httpServer.address();
    if (!address || typeof address === 'string')
      throw new Error(`Missing local test server port for ${browserName}.`);
    const stop = async () => {
      if (!httpServer.listening) return;
      const closed = new Promise<void>((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve())),
      );
      if ('closeAllConnections' in httpServer) httpServer.closeAllConnections();
      await closed;
    };
    try {
      await run({
        url: `http://127.0.0.1:${address.port}/`,
        start: () =>
          new Promise<void>((resolve) =>
            httpServer.listen(address.port, '127.0.0.1', resolve),
          ),
        stop,
      });
    } finally {
      await stop();
    }
  },
});

const openBackup = async (page: Page) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Backup & restore', { exact: true }).click();
};
const exportBackup = async (page: Page) => {
  await openBackup(page);
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download backup', exact: true })
    .click();
  const download = await pending;
  return JSON.parse(
    await readFile(await download.path(), 'utf8'),
  ) as PlayerBackup;
};

for (const tag of ['', '@cross-browser'])
  test(`keeps a Daily on its UTC date through an offline midnight reload ${tag}`, async ({
    page,
    origin,
  }) => {
    test.setTimeout(120_000);
    await page.clock.setFixedTime(new Date('2026-09-12T23:59:59.900Z'));
    await installDatabaseFixture(page, origin.url);
    await page.goto(origin.url);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.getByRole('button', { name: /^Play Daily Challenge/ }).click();
    const progress = page.getByRole('progressbar', { name: 'Quiz progress' });
    for (let index = 1; index <= 4; index++) {
      await expect(progress).toHaveText(
        `${String(index).padStart(3, '0')} / 005`,
      );
      const types = page.getByRole('combobox', { name: 'Your types' });
      if (await types.isVisible()) {
        await types.fill('bug');
        await types.press('Enter');
      } else {
        await page.locator('.answer').first().click();
      }
      const check = page.getByRole('button', {
        name: 'Check answers',
        exact: true,
      });
      if (await check.isVisible()) await check.click();
      await page
        .getByRole('button', { name: 'Next question', exact: true })
        .click();
    }
    await expect(progress).toHaveText('005 / 005');
    const prompt = await page.locator('#question-prompt').textContent();
    await expect
      .poll(async () => (await readRound(page))?.answers.length)
      .toBe(4);
    await page.clock.setFixedTime(new Date('2026-09-13T00:00:00.100Z'));
    await origin.stop();
    await expect(fetch(origin.url)).rejects.toThrow();
    await page.reload();
    await expect(progress).toHaveText('005 / 005', { timeout: 15_000 });
    await expect(
      page.getByText('Daily Challenge · Sep 12, 2026'),
    ).toBeVisible();
    await expect(page.locator('#question-prompt')).toHaveText(prompt!);
    await page.getByRole('button', { name: /^Show 4 choices/ }).click();
    await page.locator('.answer').first().click();
    await page
      .getByRole('button', { name: 'See results', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Daily complete', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Back to start', exact: true })
      .click();
    await expect(
      page.getByRole('button', {
        name: /Play Daily Challenge for Sep 13, 2026/,
      }),
    ).toBeVisible();
    const backup = await exportBackup(page);
    expect(backup.version).toBe(3);
    if (backup.version !== 3)
      throw new Error('Expected the new local backup format.');
    const key = getDailyResultKey('2026-09-12', {
      difficulty: 3,
      scope: 'all',
    });
    expect(Object.keys(backup.state.save.data.results.daily)).toEqual([key]);
    expect(backup.state.save.data.results.streak.creditedDates).toEqual([]);
    expect(backup.records.local_completions).toHaveLength(1);
    const actions = backup.records.local_actions
      .map((row) => JSON.parse(row.payload) as Action)
      .filter((action) => action.kind === 'completion.record');
    expect(actions).toHaveLength(1);
    const completed = actions[0]!.payload as RoundCompletion;
    expect(completed.dailyDate).toBe('2026-09-12');
    expect(completed.completedAt).toBe('2026-09-13T00:00:00.100Z');
    await page
      .getByRole('button', { name: 'Close settings', exact: true })
      .click();
    await page.reload();
    await page.getByRole('button', { name: /^Play Daily Challenge/ }).click();
    await expect(progress).toHaveText('001 / 005');
    await expect(
      page.getByText('Daily Challenge · Sep 13, 2026'),
    ).toBeVisible();
  });

for (const tag of ['', '@cross-browser'])
  test(`finishes offline and restores complete game records in a fresh browser ${tag}`, async ({
    page,
    context,
    browser,
    browserName,
    origin,
  }) => {
    test.setTimeout(180_000);
    const legacy = JSON.stringify({
      version: SAVE_SCHEMA_VERSION,
      restoreId: null,
      data: {
        ...emptyPlayerData(),
        settings: {
          ...defaultGameSettings,
          difficulty: 3,
          questionSelection: 'custom',
          generations: ['I'],
          questionTypes: ['pokedex-scan'],
          trainingMode: 'custom',
          answerFlow: 'instant',
          soundVolume: 0,
        },
      },
    });
    await page.addInitScript(
      (legacy) => localStorage.setItem('quizmon.player', legacy),
      legacy,
    );
    await installDatabaseFixture(page, origin.url);
    await page.goto(origin.url);
    await openBackup(page);
    await expect(
      page.getByRole('button', { name: 'Import browser progress' }),
    ).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Close settings', exact: true })
      .click();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page
      .getByRole('button', { name: 'Start training', exact: true })
      .click();
    const progress = page.getByRole('progressbar', { name: 'Quiz progress' });
    await expect(progress).toHaveText('001 / 010');
    await page.locator('.answer').first().click();
    await expect(progress).toHaveText('002 / 010');
    // Stop the actual origin because WebKit's offline emulation can bypass its service worker.
    await origin.stop();
    await expect(fetch(origin.url)).rejects.toThrow();
    if (browserName === 'chromium') await context.setOffline(true);
    await page.reload();
    await expect(progress).toHaveText('002 / 010');
    for (let index = 2; index <= 10; index++) {
      await expect(progress).toHaveText(
        `${String(index).padStart(3, '0')} / 010`,
      );
      await page.locator('.answer:not(:disabled)').first().click();
    }
    await expect(
      page.getByRole('heading', { name: 'Training complete' }),
    ).toBeVisible();
    await page.reload();
    const backup = await exportBackup(page);
    expect(backup.version).toBe(3);
    if (backup.version !== 3)
      throw new Error('Expected the new local backup format.');
    const trainingBests = Object.values(
      backup.state.save.data.results.training,
    );
    expect(trainingBests).toHaveLength(1);
    expect(trainingBests[0]?.answers).toHaveLength(10);
    expect(trainingBests[0]?.rules).toMatchObject({
      difficulty: 3,
      generations: ['I'],
      questionTypes: ['pokedex-scan'],
    });
    expect(backup.records.local_completions).toHaveLength(1);
    expect(backup.records.completion_facts).toHaveLength(0);
    expect(backup.records.local_completions[0]!.id).toMatch(/^[a-f\d-]{36}$/);
    expect(
      backup.records.local_actions.filter(
        (row) =>
          (JSON.parse(row.payload) as { kind: string }).kind ===
          'completion.record',
      ),
    ).toHaveLength(1);
    await origin.start();
    const fresh = await browser.newContext();
    try {
      const second = await fresh.newPage();
      await second.goto(origin.url);
      await openBackup(second);
      await second.getByLabel('Choose backup file').setInputFiles({
        name: 'quizmon.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(backup)),
      });
      await Promise.all([
        second.waitForEvent('load'),
        second
          .getByRole('button', { name: 'Replace and restore', exact: true })
          .click(),
      ]);
      await expect(
        second.getByRole('dialog', { name: 'Settings' }),
      ).toHaveCount(0);
      const restored = await exportBackup(second);
      expect(restored.version).toBe(3);
      if (restored.version !== 3)
        throw new Error('Expected the new local backup format.');
      expect(restored.state.datasetId).toBe(backup.state.datasetId);
      expect({
        ...restored.state.save.data,
        pokedex: restored.state.save.data.pokedex.toSorted(),
      }).toEqual({
        ...backup.state.save.data,
        pokedex: backup.state.save.data.pokedex.toSorted(),
      });
      expect(restored.records).toEqual(backup.records);
    } finally {
      await fresh.close();
    }
  });

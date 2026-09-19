import { startBrowserOrigin } from './browser-origin.ts';
import { isRecord } from '../../src/lib/validation.ts';
import { chromium, expect, webkit, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import type { PlayerBackup } from '../../src/features/settings/backup.ts';

const localOrigin = process.env.QUIZMON_GAME_ORIGIN
  ? undefined
  : await startBrowserOrigin();
const origin = process.env.QUIZMON_GAME_ORIGIN ?? localOrigin!.origin;
const browser = await (
  process.env.QUIZMON_BROWSER === 'webkit' ? webkit : chromium
).launch();
const database = new Client({
  connectionString: 'postgresql://postgres:unused@127.0.0.1:5548/quizmon_pilot',
});
await database.connect();
const page = await browser.newPage();
page.setDefaultTimeout(25_000);
const browserErrors: string[] = [];
page.on('pageerror', (error) => {
  browserErrors.push(error.message);
  console.error('Browser error:', error.stack);
});
const email = `game-${crypto.randomUUID()}@example.test`;
async function play(p: Page) {
  await p
    .getByRole('navigation', { name: 'Main', exact: true })
    .getByRole('button', { name: 'Play', exact: true })
    .click();
}
async function account(p: Page) {
  if (
    await p
      .getByRole('heading', { name: /^(Account|Sign in)$/, exact: true })
      .isVisible()
  )
    return;
  const closeSettings = p.getByRole('button', {
    name: 'Close settings',
    exact: true,
  });
  if (await closeSettings.isVisible()) await closeSettings.click();
  await p
    .locator('.app-utilities')
    .getByRole('button', { name: /^(Sign in|Account|Review account)$/ })
    .click();
  await expect(
    p.getByRole('heading', { name: /^(Account|Sign in)$/, exact: true }),
  ).toBeVisible();
}
async function openBackup(p: Page) {
  if (
    !(await p
      .getByRole('dialog', { name: 'Settings', exact: true })
      .isVisible())
  ) {
    if (
      !(await p
        .getByRole('button', { name: 'Settings', exact: true })
        .isVisible())
    )
      await play(p);
    await p.getByRole('button', { name: 'Settings', exact: true }).click();
  }
  if (
    !(await p
      .getByRole('button', { name: 'Download backup', exact: true })
      .isVisible())
  )
    await p.getByText('Backup & restore', { exact: true }).click();
}
async function ready(p: Page) {
  await p.goto(origin);
  await expect(
    p.getByRole('button', { name: 'Start training', exact: true }),
  ).toBeEnabled({ timeout: 45_000 });
}
let lastSignIn = 0;
async function signIn(p: Page, address: string, merge?: 'add' | 'keep') {
  // Rapid account switching shares the Worker's per-IP authentication limit.
  await setTimeout(Math.max(0, lastSignIn + 65_000 - Date.now()));
  lastSignIn = Date.now();
  await account(p);
  await p.getByLabel('Email', { exact: true }).fill(address);
  await p
    .getByRole('button', { name: 'Send sign-in code', exact: true })
    .click();
  await p
    .getByRole('button', { name: 'Read local test mailbox', exact: true })
    .click();
  await expect(p.getByLabel('Sign-in code', { exact: true })).toHaveValue(
    /^\d{6}$/,
  );
  if (merge) {
    await p
      .getByRole('region', { name: /^(Account|Sign in)$/, exact: true })
      .getByRole('button', { name: 'Sign in', exact: true })
      .click();
    const choice = p.getByRole('button', {
      name: merge === 'add' ? 'Add browser progress' : 'Use account progress',
      exact: true,
    });
    await expect(choice).toBeVisible({ timeout: 45_000 });
    await Promise.all([p.waitForEvent('load'), choice.click()]);
  } else {
    await Promise.all([
      p.waitForEvent('load'),
      p
        .getByRole('region', { name: /^(Account|Sign in)$/, exact: true })
        .getByRole('button', { name: 'Sign in', exact: true })
        .click(),
    ]);
  }
  await expect(
    p.getByRole('button', { name: 'Start training', exact: true }),
  ).toBeVisible({ timeout: 45_000 });
  await account(p);
  await expect(
    p
      .getByRole('region', { name: /^(Account|Sign in)$/, exact: true })
      .getByText('Synced', { exact: true }),
  ).toBeVisible({ timeout: 65_000 });
}
async function backup(p: Page) {
  await openBackup(p);
  const next = p.waitForEvent('download');
  await p.getByRole('button', { name: 'Download backup', exact: true }).click();
  const download = await next;
  const value = JSON.parse(
    await readFile(await download.path(), 'utf8'),
  ) as PlayerBackup;
  await p.getByRole('button', { name: 'Close settings', exact: true }).click();
  return value;
}
async function accountExport(
  p: Page,
  expected: PlayerBackup,
  played: PlayerBackup,
) {
  assert.ok(played.version === 3);
  assert.equal(expected.version, 3);
  assert.ok(expected.version === 3 && expected.state.account);
  const owner = expected.state.account;
  await account(p);
  const pending = p.waitForEvent('download');
  await p
    .getByRole('button', { name: 'Export account data', exact: true })
    .click();
  const download = await pending;
  assert.equal(await download.failure(), null);
  assert.equal(download.suggestedFilename(), 'quizmon-account.json');
  const exported: unknown = JSON.parse(
    await readFile(await download.path(), 'utf8'),
  );
  assert.ok(isRecord(exported));
  assert.equal(exported.format, 'quizmon-account-export');
  assert.equal(exported.version, 1);
  assert.equal(exported.accountId, owner.id);
  assert.equal(exported.generationId, owner.generationId);
  assert.equal(exported.serverEpoch, owner.serverEpoch);
  assert.ok(isRecord(exported.account) && exported.account.id === owner.id);
  assert.ok(isRecord(exported.state));
  assert.ok(isRecord(exported.state.progress));
  assert.equal(exported.state.progress.rounds, 1);
  assert.ok(Array.isArray(exported.completionFacts));
  assert.equal(exported.completionFacts.length, 1);
  const local = played.records.local_actions.flatMap((row) => {
    const operation: unknown = JSON.parse(row.payload);
    return isRecord(operation) && operation.kind === 'completion.record'
      ? [operation.payload]
      : [];
  });
  assert.equal(local.length, 1);
  for (const fact of exported.completionFacts) {
    assert.ok(isRecord(fact) && isRecord(fact.contribution));
    assert.equal(fact.owner_id, owner.id);
    const completion = local.find(
      (item) => isRecord(item) && item.completionId === fact.completion_id,
    );
    if (local.length) {
      assert.ok(isRecord(completion) && isRecord(completion.result));
      assert.equal(fact.contribution.points, completion.result.score);
      assert.equal(fact.content_version, completion.contentVersion);
      assert.equal(fact.score_version, completion.scoreVersion);
    }
  }
  const stored = await database.query<{ progress: unknown }>(
    'SELECT progress FROM account_state WHERE id=$1',
    [owner.id],
  );
  assert.deepEqual(exported.state.progress, stored.rows[0]!.progress);
  await expect(
    p.getByText(
      'Account export received. Check your browser downloads for the file.',
      { exact: true },
    ),
  ).toBeVisible();
  await play(p);
  return exported;
}
async function training(p: Page, showResults = true) {
  await p.getByRole('button', { name: 'Start training', exact: true }).click();
  const generation = p.getByRole('button', {
    name: 'All generations',
    exact: true,
  });
  if (await generation.isVisible()) await generation.click();
  for (let index = 1; index <= 10; index++) {
    await expect(
      p.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toHaveText(`${String(index).padStart(3, '0')} / 010`);
    await p.locator('.answer:not(:disabled)').first().click();
    const next = p.getByRole('button', {
      name: index === 10 ? 'See results' : 'Next question',
      exact: true,
    });
    await expect(next).toBeVisible();
    if (index < 10 || showResults) await next.click();
  }
}
async function configureTraining(p: Page) {
  await play(p);
  await p
    .getByRole('button', { name: 'Customize training', exact: true })
    .click();
  await expect(
    p.getByRole('dialog', { name: 'Customize training', exact: true }),
  ).toBeVisible();
  await p
    .getByRole('checkbox', { name: 'Customize questions', exact: true })
    .focus();
  await p.keyboard.press('Space');
  const selectAll = p.getByRole('button', {
    name: 'Select all question types',
    exact: true,
  });
  if (await selectAll.isVisible()) await selectAll.click();
  await p
    .getByRole('button', { name: 'Deselect all question types', exact: true })
    .click();
  const identity = p.getByRole('button', { name: /^Identity/ });
  if ((await identity.getAttribute('aria-expanded')) !== 'true')
    await identity.click();
  await p.getByRole('checkbox', { name: 'Pokédex scan', exact: true }).focus();
  await p.keyboard.press('Space');
  await p.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(
    p.getByRole('dialog', { name: 'Customize training', exact: true }),
  ).toBeHidden();
}

try {
  await ready(page);
  await configureTraining(page);
  await training(page);
  await page
    .getByRole('button', { name: 'Back to start', exact: true })
    .click();
  const guest = await backup(page);
  assert.equal(guest.version, 3);
  console.log('Real guest round saved.');
  await signIn(page, email);
  const first = await backup(page);
  assert.equal(first.version, 3);
  const firstExport = await accountExport(page, first, guest);
  const second = await browser.newPage();
  second.setDefaultTimeout(25_000);
  await ready(second);
  await signIn(second, email);
  const downloaded = await backup(second);
  assert.deepEqual(downloaded.save.data.results, first.save.data.results);
  assert.deepEqual(downloaded.save.data.pokedex, first.save.data.pokedex);
  assert.deepEqual(downloaded.save.data.profile, first.save.data.profile);
  assert.deepEqual(downloaded.save.data.settings, first.save.data.settings);
  const secondExport = await accountExport(second, downloaded, guest);
  for (const section of [
    'completionFacts',
    'dailyResults',
    'trainingBests',
    'discoveries',
  ])
    assert.deepEqual(secondExport[section], firstExport[section]);
  console.log(
    'Account export downloaded through the UI in both contexts; owner, versions, score, and retained progress match.',
  );
  await second.context().close();
  console.log(
    'A fresh browser downloaded the same completed progress and Trainer profile.',
  );
  await page.context().setOffline(true);
  await training(page, false);
  await page.context().setOffline(false);
  await expect
    .poll(
      async () => {
        const result = await database.query<{ progress: { rounds: number } }>(
          'SELECT a.progress FROM account_state a JOIN "user" u ON u.id=a.id WHERE u.email=$1',
          [email],
        );
        return result.rows[0]?.progress.rounds;
      },
      { timeout: 65_000 },
    )
    .toBe(2);
  console.log(
    'Offline completion uploaded automatically before See results was pressed.',
  );
  await page.getByRole('button', { name: 'See results', exact: true }).click();
  await page
    .getByRole('button', { name: 'Back to start', exact: true })
    .click();
  await account(page);
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Sign out', exact: true }).click(),
  ]);
  await expect(
    page.getByRole('button', { name: 'Start training', exact: true }),
  ).toBeVisible();
  const guestAfter = await backup(page);
  assert.deepEqual(guestAfter.save.data.pokedex, []);
  assert.deepEqual(guestAfter.save.data.results.training, {});
  console.log('Signing out opened a separate empty guest save.');

  await configureTraining(page);
  await training(page);
  await page
    .getByRole('button', { name: 'Back to start', exact: true })
    .click();
  const separateGuest = await backup(page);
  await signIn(page, email, 'keep');
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Sign out', exact: true }).click(),
  ]);
  await ready(page);
  assert.deepEqual(
    (await backup(page)).save.data.results,
    separateGuest.save.data.results,
  );
  await signIn(page, email, 'add');
  await expect
    .poll(
      async () =>
        (
          await database.query<{ progress: { rounds: number } }>(
            'SELECT a.progress FROM account_state a JOIN "user" u ON u.id=a.id WHERE u.email=$1',
            [email],
          )
        ).rows[0]?.progress.rounds,
    )
    .toBe(3);
  console.log(
    'Both merge choices preserve the intended save, with one contribution after linking.',
  );

  const historyDevice = await browser.newPage();
  await ready(historyDevice);
  await signIn(historyDevice, email);
  const full = await backup(historyDevice);
  assert.equal(full.records.completion_facts.length, 3);
  assert.ok(
    full.records.completion_facts.every((row) => {
      const game = (
        JSON.parse(row.payload) as {
          completion: {
            recordVersion: number;
            result: { answers: { observation?: unknown }[] };
          };
        }
      ).completion;
      return (
        game.recordVersion === 1 &&
        game.result.answers.length === 10 &&
        game.result.answers.every(
          (answer: { observation?: unknown }) => answer.observation,
        )
      );
    }),
  );
  await historyDevice.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (localOrigin) {
    await localOrigin.stop();
    await assert.rejects(fetch(origin));
  } else {
    await historyDevice.context().setOffline(true);
  }
  await historyDevice.reload();
  await ready(historyDevice);
  assert.deepEqual(
    (await backup(historyDevice)).records.completion_facts,
    full.records.completion_facts,
  );
  console.log(
    'Full answer history remained available on the second device after an offline reload.',
  );
  assert.deepEqual(browserErrors, []);
  console.log('MAIN GAME ACCOUNT CHECKS PASSED');
} catch (error) {
  console.error(error);
  if (!page.isClosed())
    console.error(
      await page
        .locator('body')
        .innerText()
        .catch(() => 'Page closed during failure inspection.'),
    );
  if (!page.isClosed())
    await page
      .screenshot({
        path: '/tmp/quizmon-main-game-failure.png',
        fullPage: true,
      })
      .catch(() => {});
  throw error;
} finally {
  await browser.close();
  await database.end();
  await localOrigin?.close();
}

import { completion } from '../tests/online/progress-fixtures';
import { seedPlayer } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { emptyPlayerData } from '../src/domain/player/player-save';
import { defaultGameSettings } from '../src/domain/settings/game-settings';
import type { PlayerBackup } from '../src/features/settings/backup';
import { readRound, readSave } from './database-fixture';
import { expect, test } from './fixtures';

const save: PlayerBackup['state']['save'] = {
  version: 1,
  restoreId: null,
  data: {
    ...emptyPlayerData(),
    generationPromptAnswered: true,
    settings: {
      ...defaultGameSettings,
      soundVolume: 0.2,
      generations: ['II'],
      questionTypes: ['pokedex-scan'],
      trainingMode: 'custom',
    },
    profile: {
      avatar: null,
      createdAt: '2026-09-01',
      hasBeenRevealed: true,
      name: 'Leaf',
      partnerPokemon: 'chikorita',
      specialty: null,
    },
    results: {
      ...emptyPlayerData().results,
      league: { completed: false, seed: null },
    },
  },
};

const backup: PlayerBackup = {
  format: 'quizmon-backup',
  version: 1,
  exportedAt: '2026-09-07T09:00:00.000Z',
  state: {
    version: 1,
    datasetId: 'e65109a4-a8cf-4f8d-8b84-a471c5bcc001',
    predecessors: {},
    save,
  },
  records: { local_actions: [], local_completions: [], completion_facts: [] },
};

const backupFile = {
  name: 'quizmon.json',
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(backup)),
};

test('removes pre-reset browser data on startup', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.setItem('quizmon.account.v1', 'old-account');
    localStorage.setItem('quizmon.baseline.marker', 'keep');
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('quizmon-guest-v2.sqlite', 1);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () =>
        reject(request.error ?? new Error('Could not seed old database.'));
    });
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(async () => ({
        oldAccount: localStorage.getItem('quizmon.account.v1'),
        marker: localStorage.getItem('quizmon.baseline.marker'),
        oldDatabase: (await indexedDB.databases()).some(
          ({ name }) => name === 'quizmon-guest-v2.sqlite',
        ),
      })),
    )
    .toEqual({ oldAccount: null, marker: 'keep', oldDatabase: false });
});

for (const width of [320, 390, 1280]) {
  test(`exports and restores a validated backup after preview at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const backupDisclosure = page
      .locator('summary')
      .filter({ hasText: 'Backup & restore' });
    await backupDisclosure.scrollIntoViewIfNeeded();
    await expect(backupDisclosure).toBeInViewport();
    await backupDisclosure.focus();
    await backupDisclosure.press('Enter');
    await expect(backupDisclosure).toBeFocused();
    await page.locator('.backup-settings__actions').scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('button', { name: 'Download backup' }),
    ).toBeInViewport();
    await expect(
      page.getByRole('button', { name: 'Restore backup', exact: true }),
    ).toBeInViewport();
    for (const name of ['Download backup', 'Restore backup']) {
      const lines = await page
        .getByRole('button', { name, exact: true })
        .evaluate((button) => {
          const range = document.createRange();
          range.selectNodeContents(button);
          return range.getClientRects().length;
        });
      expect(lines).toBe(1);
    }
    const before = await readSave(page).then((saved) =>
      saved ? JSON.stringify(saved) : null,
    );
    await page.getByLabel('Choose backup file').setInputFiles(backupFile);
    const preview = page.getByRole('region', { name: 'Restore preview' });
    await expect(preview).toBeVisible();
    await expect(
      preview.getByRole('cell', { name: 'Leaf', exact: true }),
    ).toBeVisible();
    expect(
      await readSave(page).then((saved) =>
        saved ? JSON.stringify(saved) : null,
      ),
    ).toBe(before);
    await page.getByRole('button', { name: 'Cancel restore' }).click();
    await expect(preview).toBeHidden();
    expect(
      await readSave(page).then((saved) =>
        saved ? JSON.stringify(saved) : null,
      ),
    ).toBe(before);

    await page.getByLabel('Choose backup file').setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"format":"wrong"}'),
    });
    await expect(page.getByRole('alert')).toContainText('not a Quizmon backup');
    await expect(
      page.getByRole('button', { name: 'Import old save' }),
    ).toHaveCount(0);
    expect(
      await readSave(page).then((saved) =>
        saved ? JSON.stringify(saved) : null,
      ),
    ).toBe(before);

    await page.getByLabel('Choose backup file').setInputFiles(backupFile);
    await expect(preview).toBeVisible();
    const overflow = await preview.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    );
    expect(overflow).toBe(false);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole('button', { name: 'Replace and restore' }).focus();
    expect(
      await page
        .getByRole('dialog', { name: 'Settings' })
        .evaluate((element) => element.scrollTop),
    ).toBe(0);
    await page.getByRole('button', { name: 'Replace and restore' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
    await expect
      .poll(() =>
        readSave(page).then(
          (saved) =>
            (
              JSON.parse(
                (saved ? JSON.stringify(saved) : null)!,
              ) as PlayerBackup['state']['save']
            ).data,
        ),
      )
      .toEqual(backup.state.save.data);

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByText('Backup & restore', { exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download backup' }).click();
    const download = await pending;
    await expect(page.locator('.toast').getByRole('status')).toHaveText(
      'Backup download started.',
    );
    await expect(page.locator('.toast').getByRole('status')).toBeInViewport();
    await expect(page.locator('.toast:popover-open')).toBeVisible();
    expect(download.suggestedFilename()).toMatch(
      /^quizmon-backup-Leaf-\d{4}-\d{2}-\d{2}\.json$/,
    );
    const path = await download.path();
    expect(path).not.toBeNull();
    const exported = JSON.parse(await readFile(path, 'utf8')) as PlayerBackup;
    expect(exported.state.save.data).toEqual(backup.state.save.data);
    expect(exported.format).toBe('quizmon-backup');
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
    await expect(page.locator('.toast').getByRole('status')).toHaveCount(0);
    await page.getByRole('button', { name: 'Download backup' }).click();
    await expect(page.locator('.toast:popover-open')).toBeVisible();
    await page.mouse.move(1, 1);
    await expect(page.locator('.toast').getByRole('status')).toHaveCount(0, {
      timeout: 8000,
    });
  });
}

test('restoring in one tab stops a stale round in another tab', async ({
  context,
  page,
}) => {
  await page.goto('/');
  const other = await context.newPage();
  await other.goto('/');
  await other
    .getByRole('button', { name: 'Start training', exact: true })
    .click();
  await expect(
    other.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Backup & restore', { exact: true }).click();
  await page.getByLabel('Choose backup file').setInputFiles(backupFile);
  await page.getByRole('button', { name: 'Replace and restore' }).click();
  await expect(
    other.getByRole('button', { name: 'Start training', exact: true }),
  ).toBeVisible();
  expect(
    await readRound(other).then((saved) =>
      saved ? JSON.stringify(saved) : null,
    ),
  ).toBeNull();
  await other.close();
});

for (const browser of ['', '@cross-browser']) {
  test(`keeps Daily playable with completed history after reload ${browser}`, async ({
    page,
  }) => {
    const historical = {
      ...completion(crypto.randomUUID(), 'daily', { dailyDate: '2026-09-01' })
        .result,
      dailyTrack: { difficulty: 3 as const, scope: 'all' as const },
    };
    await seedPlayer(page, {
      results: { daily: { '2026-09-01:3:all': historical } },
    });
    await page.goto('/');
    const daily = page.getByRole('button', { name: /^Play Daily Challenge/ });
    await expect(daily).toBeEnabled({ timeout: 15_000 });
    await expect(page.getByText('Browser storage required')).toHaveCount(0);
    await page.reload();
    await expect(daily).toBeEnabled({ timeout: 15_000 });
    expect(
      await readSave(page).then((saved) => {
        const save = JSON.parse(
          (saved ? JSON.stringify(saved) : null) ?? '{}',
        ) as PlayerBackup['state']['save'];
        return save.data.results.daily['2026-09-01:3:all'];
      }),
    ).toEqual(historical);
    await daily.click();
    await expect(
      page.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toBeVisible();
  });
}

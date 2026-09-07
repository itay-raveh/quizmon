import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { emptyPlayerData } from '../src/game/player-data';
import { defaultModifiers } from '../src/game/game';
import type { PlayerBackup } from '../src/game/backup';
import { expect, test } from './fixtures';

const backup: PlayerBackup = {
  format: 'quizmon-backup',
  version: 1,
  exportedAt: '2026-09-07T09:00:00.000Z',
  save: {
    version: 2,
    restoreId: null,
    data: {
      ...emptyPlayerData(),
      generationPromptAnswered: true,
      settings: {
        ...defaultModifiers,
        soundVolume: 0.2,
        generations: ['II'],
        questionTypes: ['pokedex-scan'],
        trainingMode: 'custom',
      },
      profile: {
        version: 1,
        createdAt: '2026-09-01',
        hasBeenRevealed: true,
        name: 'Leaf',
        partnerPokemon: 'chikorita',
        specialty: null,
      },
      results: {
        ...emptyPlayerData().results,
        league: { completed: true, seed: null },
      },
    },
  },
};

for (const width of [320, 390, 1280]) {
  test(`exports and restores a validated backup after preview at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Backup' })).toBeInViewport();
    await page.getByRole('tab', { name: 'Training' }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'Backup' })).toBeFocused();
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
    const before = await page.evaluate(() =>
      localStorage.getItem('quizmon.player'),
    );
    await page.getByLabel('Choose backup file').setInputFiles({
      name: 'quizmon.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    const preview = page.getByRole('region', { name: 'Restore preview' });
    await expect(preview).toBeVisible();
    await expect(
      preview.getByRole('cell', { name: 'Leaf', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem('quizmon.player')),
    ).toBe(before);
    await page.getByRole('button', { name: 'Cancel restore' }).click();
    await expect(preview).toBeHidden();
    expect(
      await page.evaluate(() => localStorage.getItem('quizmon.player')),
    ).toBe(before);

    await page.getByLabel('Choose backup file').setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"format":"wrong"}'),
    });
    await expect(page.getByRole('alert')).toContainText('not a Quizmon backup');
    await expect(
      page.getByRole('button', { name: 'Replace and restore' }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.getItem('quizmon.player')),
    ).toBe(before);

    await page.getByLabel('Choose backup file').setInputFiles({
      name: 'quizmon.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    });
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
        page.evaluate(
          () =>
            (
              JSON.parse(
                localStorage.getItem('quizmon.player')!,
              ) as PlayerBackup['save']
            ).data,
        ),
      )
      .toEqual(backup.save.data);

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Backup' }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download backup' }).click();
    const download = await pending;
    await expect(page.getByRole('status')).toHaveText(
      'Backup download started.',
    );
    await expect(page.getByRole('status')).toBeInViewport();
    await expect(page.locator('.toast:popover-open')).toBeVisible();
    if (width < 400) {
      const toast = await page.locator('.toast').boundingBox();
      const actions = await page
        .locator('.modifiers-form__actions')
        .boundingBox();
      expect(toast!.y + toast!.height).toBeLessThan(actions!.y);
    }
    expect(download.suggestedFilename()).toMatch(
      /^quizmon-backup-Leaf-\d{4}-\d{2}-\d{2}\.json$/,
    );
    const path = await download.path();
    expect(path).not.toBeNull();
    const exported = JSON.parse(await readFile(path, 'utf8')) as PlayerBackup;
    expect(exported.save.data).toEqual(backup.save.data);
    expect(exported.format).toBe('quizmon-backup');
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
    await expect(page.getByRole('status')).toHaveCount(0);
    await page.getByRole('button', { name: 'Download backup' }).click();
    await expect(page.locator('.toast:popover-open')).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0, { timeout: 8000 });
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
  await page.getByRole('tab', { name: 'Backup' }).click();
  await page.getByLabel('Choose backup file').setInputFiles({
    name: 'quizmon.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole('button', { name: 'Replace and restore' }).click();
  await expect(
    other.getByRole('button', { name: 'Start training', exact: true }),
  ).toBeVisible();
  expect(
    await other.evaluate(() =>
      sessionStorage.getItem('quizmon.active-game.v1'),
    ),
  ).toBeNull();
  await other.close();
});

for (const browser of ['', '@cross-browser']) {
  test(`keeps Daily playable after migrating historical results ${browser}`, async ({
    page,
  }) => {
    const historical = {
      answers: [{ category: 'identity', correct: true, points: 1000 }],
      contentVersion: 1,
      correctCount: 1,
      elapsedSeconds: 12,
      questionCount: 1,
      score: 1000,
    };
    await page.addInitScript((result) => {
      if (!localStorage.getItem('quizmon.player')) {
        localStorage.setItem(
          'quizmon.results.v2',
          JSON.stringify({
            daily: { '2026-09-01': result },
          }),
        );
      }
    }, historical);
    await page.goto('/');
    const daily = page.getByRole('button', { name: /^Play Daily Challenge/ });
    await expect(daily).toBeEnabled();
    await expect(page.getByText('Browser storage required')).toHaveCount(0);
    await page.reload();
    await expect(daily).toBeEnabled();
    expect(
      await page.evaluate(() => {
        const save = JSON.parse(
          localStorage.getItem('quizmon.player') ?? '{}',
        ) as PlayerBackup['save'];
        return save.data.results.daily['2026-09-01'];
      }),
    ).toEqual(historical);
    await daily.click();
    await expect(
      page.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toBeVisible();
  });
}

import { action } from '../tests/online/progress-fixtures';
import { emptyPlayerData } from '../src/domain/player/player-save';
import { readSave, readRawPlayer } from './database-fixture';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import currentSave from '../tests/fixtures/player-save.v7.json' with { type: 'json' };
import { expect, expectNoHorizontalOverflow, test } from './fixtures';

for (const width of [360, 1280]) {
  test(`preserves, exports, and resets malformed saved data at ${width}px`, async ({
    page,
  }) => {
    const raw = '{ "version": 6, "data": BROKEN\n';
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript((raw) => {
      if (sessionStorage.getItem('recovery-seeded')) return;
      sessionStorage.setItem('recovery-seeded', '1');
      localStorage.setItem('quizmon.player', raw);
    }, raw);
    await page.goto('/');
    const dialog = page.getByRole('dialog', {
      name: 'Your saved data could not be loaded',
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 1 })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start training', exact: true }),
    ).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('recovery.png'),
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const downloadReady = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download saved data' }).click();
    const download = await downloadReady;
    const exported = JSON.parse(
      await readFile(await download.path(), 'utf8'),
    ) as { database: { local_state: { id: string; payload: string }[] } };
    expect(
      exported.database.local_state.find((entry) => entry.id === 'player')
        ?.payload,
    ).toBe(await readRawPlayer(page));
    await dialog.getByRole('button', { name: 'Try again' }).click();
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole('button', { name: 'Start fresh', exact: true })
      .click();
    await dialog.getByRole('button', { name: 'Keep saved data' }).click();
    expect(
      await page.evaluate(() => localStorage.getItem('quizmon.player')),
    ).toBe(raw);
    await dialog
      .getByRole('button', { name: 'Start fresh', exact: true })
      .click();
    await dialog
      .getByRole('button', { name: 'Delete and start fresh' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Start training', exact: true }),
    ).toBeVisible();
    const saved = await readSave(page);
    expect(saved.version).toBe(7);
    expect(saved.restoreId).toBeTruthy();
  });
}

test('restores a current backup from a retired save @cross-browser', async ({
  page,
}) => {
  const raw = JSON.stringify({ ...currentSave, version: 3 });
  await page.addInitScript((raw) => {
    if (sessionStorage.getItem('recovery-seeded')) return;
    sessionStorage.setItem('recovery-seeded', '1');
    localStorage.setItem('quizmon.player', raw);
  }, raw);
  await page.goto('/');
  const dialog = page.getByRole('dialog', {
    name: 'This save needs attention',
  });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  const datasetId = crypto.randomUUID();
  const discovery = action(datasetId, datasetId, 'discoveries.add', {
    pokemon: ['pikachu'],
  });
  const save = {
    version: 7,
    restoreId: null,
    data: { ...emptyPlayerData(), pokedex: ['pikachu'] },
  };
  await page.getByLabel('Choose recovery backup').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'quizmon-backup',
        version: 3,
        exportedAt: '2026-09-15T12:00:00.000Z',
        save,
        state: { version: 1, datasetId, predecessors: {}, save },
        records: {
          local_actions: [
            { id: discovery.operationId, payload: JSON.stringify(discovery) },
          ],
          local_completions: [],
          completion_facts: [],
        },
      }),
    ),
  });
  await expect(
    dialog.getByRole('region', { name: 'Restore preview' }),
  ).toContainText('1 Pokédex entries');
  expect(
    await page.evaluate(() => localStorage.getItem('quizmon.player')),
  ).toBe(raw);
  await Promise.all([
    page.waitForEvent('load'),
    dialog.getByRole('button', { name: 'Replace and restore' }).click(),
  ]);
  await expect(
    page.getByRole('button', { name: 'Start training', exact: true }),
  ).toBeVisible();
  expect((await readSave(page)).data.pokedex).toEqual(['pikachu']);
});

test('keeps a newer save intact and does not offer a reset', async ({
  page,
}) => {
  const raw = JSON.stringify({ ...currentSave, version: 8 });
  await page.addInitScript(
    (raw) => localStorage.setItem('quizmon.player', raw),
    raw,
  );
  await page.goto('/');
  const dialog = page.getByRole('dialog', {
    name: 'Update Quizmon to load this save',
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Start fresh', exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole('button', { name: 'Download saved data' }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() => localStorage.getItem('quizmon.player')),
  ).toBe(raw);
});

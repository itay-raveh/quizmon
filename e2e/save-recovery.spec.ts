import { readSave, readRawPlayer } from './database-fixture';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import currentSave from '../tests/fixtures/player-save.v1.json' with { type: 'json' };
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
      localStorage.setItem('quizmon.baseline.fixture-save', raw);
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
      await page.evaluate(() =>
        localStorage.getItem('quizmon.baseline.fixture-save'),
      ),
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
    expect(saved.version).toBe(1);
    expect(saved.restoreId).toBeTruthy();
  });
}

test('keeps a newer save intact and does not offer a reset', async ({
  page,
}) => {
  const raw = JSON.stringify({ ...currentSave, version: 8 });
  await page.addInitScript(
    (raw) => localStorage.setItem('quizmon.baseline.fixture-save', raw),
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
    await page.evaluate(() =>
      localStorage.getItem('quizmon.baseline.fixture-save'),
    ),
  ).toBe(raw);
});

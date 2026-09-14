import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import currentSave from '../tests/fixtures/player-save.v6.json' with { type: 'json' };
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
    ) as { entries: { key: string; raw: string }[] };
    expect(
      exported.entries.find((entry) => entry.key === 'quizmon.player')?.raw,
    ).toBe(raw);
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
    const saved = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('quizmon.player')!) as {
          version: number;
          restoreId: string;
        },
    );
    expect(saved.version).toBe(6);
    expect(saved.restoreId).toBeTruthy();
  });
}

test('restores a current backup from a retired save @cross-browser', async ({
  page,
}) => {
  const raw = JSON.stringify({ ...currentSave, version: 5 });
  await page.addInitScript((raw) => {
    if (sessionStorage.getItem('recovery-seeded')) return;
    sessionStorage.setItem('recovery-seeded', '1');
    localStorage.setItem('quizmon.player', raw);
  }, raw);
  await page.goto('/');
  const dialog = page.getByRole('dialog', {
    name: 'This save needs attention',
  });
  await expect(dialog).toBeVisible();
  await page.getByLabel('Choose recovery backup').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'quizmon-backup',
        version: 1,
        exportedAt: '2026-09-15T12:00:00.000Z',
        save: {
          ...currentSave,
          data: { ...currentSave.data, pokedex: ['pikachu'] },
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
  await dialog.getByRole('button', { name: 'Replace and restore' }).click();
  await expect(
    page.getByRole('button', { name: 'Start training', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          JSON.parse(localStorage.getItem('quizmon.player')!) as {
            data: { pokedex: string[] };
          }
        ).data.pokedex,
    ),
  ).toEqual(['pikachu']);
});

test('keeps a newer save intact and does not offer a reset', async ({
  page,
}) => {
  const raw = JSON.stringify({ ...currentSave, version: 7 });
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

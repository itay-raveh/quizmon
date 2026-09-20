import { readRawPlayer } from './database-fixture';
import { emptyPlayerData } from '../src/domain/player/player-save';
import { expect, test } from './fixtures';

for (const version of [4, 5, 6]) {
  test(`rejects retired schema ${version} without rewriting it`, async ({
    page,
  }) => {
    const save = { version, restoreId: null, data: emptyPlayerData() };
    await page.addInitScript((save) => {
      localStorage.setItem('quizmon.player', JSON.stringify(save));
    }, save);
    await page.goto('/');
    await expect(
      page.getByRole('dialog', { name: 'This save needs attention' }),
    ).toBeVisible();
    const stored = JSON.parse(await readRawPlayer(page)) as { save: unknown };
    expect(stored.save).toEqual(save);
    await expect(
      page.getByRole('button', { name: 'Start training' }),
    ).toHaveCount(0);
  });
}

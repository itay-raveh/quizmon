import type { PlayerSave } from '../src/game/player-data';
import {
  catalog,
  expect,
  expectNoHorizontalOverflow,
  formatName,
  test,
} from './fixtures';
import { buildQuestionType } from '../src/game/questions/registry';
import { createSeededRandom } from '../src/game/random';
import { defaultModifiers } from '../src/game/modifiers';

for (const width of [320, 1280]) {
  test(`scrolls regional partner matches beyond six results at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?trainer=card');
    await page.getByRole('button', { name: 'Edit card' }).click();
    const search = page.getByRole('combobox', { name: 'Partner Pokémon' });
    await search.fill('Hisu');
    const names = await page.getByRole('option').allTextContents();
    expect(names).toHaveLength(16);
    const index = names.indexOf('Hisuian Typhlosion');
    expect(index).toBeGreaterThan(5);
    const typhlosion = page.getByRole('option', {
      name: 'Hisuian Typhlosion',
    });
    await expect(typhlosion).not.toBeInViewport();
    for (let position = 0; position <= index; position += 1)
      await search.press('ArrowDown');
    await expect(typhlosion).toHaveAttribute('aria-selected', 'true');
    await expect(typhlosion).toBeInViewport({ ratio: 1 });
    await search.press('Enter');
    await page.getByRole('button', { name: 'Save card' }).click();
    await expect(page.locator('.trainer-card__partner-caption')).toContainText(
      'Hisuian Typhlosion',
    );
    await expectNoHorizontalOverflow(page);
  });
}

test('selects curated partners and excludes collapsed variants', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/?trainer=card');
  for (const name of [
    'raichu-alola',
    'tauros-paldea-aqua-breed',
    'unown',
    'alcremie-gmax',
    'charizard-mega-x',
  ]) {
    await page.getByRole('button', { name: 'Edit card' }).click();
    await page
      .getByRole('combobox', { name: 'Partner Pokémon' })
      .fill(formatName(name));
    await page
      .getByRole('option', { name: formatName(name), exact: true })
      .click();
    await page.getByRole('button', { name: 'Save card' }).click();
    const caption = page.locator('.trainer-card__partner-caption');
    await expect(caption).toContainText(formatName(name));
    await expect(caption).toContainText(
      `No. ${String(catalog.pokemon[name]!.speciesId).padStart(4, '0')}`,
    );
    await expectNoHorizontalOverflow(page);
    await page.reload();
    await expect(caption).toContainText(formatName(name));
  }
  await page.getByRole('button', { name: 'Edit card' }).click();
  const search = page.getByRole('combobox', { name: 'Partner Pokémon' });
  for (const [query, names] of [
    ['Unown', ['Unown']],
    ['Alcremie', ['Alcremie', 'Gigantamax Alcremie']],
    ['Minior', ['Minior']],
    ['Keldeo', ['Keldeo']],
    ['Zygarde', ['Zygarde']],
  ] as const) {
    await search.fill(query);
    await expect(page.getByRole('option')).toHaveText([...names]);
  }
  await search.fill('Totem');
  await expect(
    page.getByText('No Pokémon found', { exact: true }),
  ).toBeVisible();
});

test('resumes a saved round after a catalog update and credits regional forms separately', async ({
  page,
}) => {
  const questions = ['raichu', 'raichu-alola'].map((name) =>
    buildQuestionType(
      {
        catalog,
        pool: [{ name, pokemon: catalog.pokemon[name]! }],
        random: createSeededRandom(name),
        used: new Set(),
      },
      'type-check',
    )!,
  );
  await page.addInitScript(
    ({ questions, modifiers }) => {
      if (sessionStorage.getItem('seeded-form-round')) return;
      sessionStorage.setItem('seeded-form-round', 'true');
      sessionStorage.setItem(
        'quizmon.active-game.v1',
        JSON.stringify({
          version: 2,
          playerRestoreId: null,
          contentVersion: 14,
          elapsedMilliseconds: 4321,
          mode: { kind: 'training' },
          modifiers,
          questionCount: 2,
          seed: 'forms-compatibility',
          questions,
          answers: [],
        }),
      );
    },
    { questions, modifiers: { ...defaultModifiers, answerFlow: 'manual' } },
  );
  await page.goto('/');
  for (const [index, question] of questions.entries()) {
    await expect(
      page.getByRole('heading', { name: 'Type check' }),
    ).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toHaveText(`${String(index + 1).padStart(3, '0')} / 002`);
    await page
      .getByRole('button', {
        name: new RegExp(`^${formatName(question.answer.correctOptions[0]!)}`),
      })
      .click();
    if (index === 0) {
      await page.reload();
      await expect(
        page.getByRole('progressbar', { name: 'Quiz progress' }),
      ).toHaveText('002 / 002');
    } else {
      await page.getByRole('button', { name: /results/i }).click();
    }
  }
  await expect(
    page.getByRole('heading', { name: 'Training complete' }),
  ).toBeVisible();
  const discoveries = await page.evaluate(
    () =>
      (JSON.parse(localStorage.getItem('quizmon.player')!) as PlayerSave).data
        .pokedex,
  );
  const version = await page.evaluate(
    () =>
      (JSON.parse(localStorage.getItem('quizmon.player')!) as PlayerSave).data
        .results.training.league?.contentVersion,
  );
  expect(version).toBe(14);
  expect(discoveries.toSorted()).toEqual(['raichu', 'raichu-alola']);
});

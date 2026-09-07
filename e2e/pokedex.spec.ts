import AxeBuilder from '@axe-core/playwright';
import { defaultModifiers, buildQuestions } from '../src/game/game';
import { emptyPlayerData } from '../src/game/player-data';
import type { PlayerSave } from '../src/game/player-data';
import { createSeededRandom } from '../src/game/random';
import { getQuestionPokemon } from '../src/game/pokedex';
import { generations, type PokemonCatalog } from '../src/game/types';
import { catalogData, expect, formatName, test } from './fixtures';

for (const width of [320, 1280]) {
  test(`browses registered and missing Pokédex entries at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const data = JSON.parse(
        localStorage.getItem('quizmon.player') ?? 'null',
      ) as PlayerSave | null;
      if (data) return;
      localStorage.setItem(
        'quizmon.results.v2',
        JSON.stringify({
          progress: {
            version: 2,
            correctPokemon: ['bulbasaur', 'ivysaur', 'venusaur', 'pikachu'],
            quickAttackCompleted: false,
            correctCategories: {},
          },
        }),
      );
    });
    await page.goto('/?trainer=pokedex');
    await expect(
      page.getByRole('heading', { name: 'Personal Pokédex' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Pokédex', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByText('4 / 1025 registered', { exact: true }),
    ).toBeVisible();
    const entries = page.locator('.trainer-pokedex__entries > li');
    await expect(entries).toHaveCount(12);
    await expect(entries.first()).toContainText('Bulbasaur');
    await expect(entries.nth(3)).toContainText('Not registered');
    await expect(entries.nth(3).locator('img')).toHaveCount(0);
    await page
      .getByRole('combobox', { name: 'Entries', exact: true })
      .selectOption('registered');
    await expect(entries).toHaveCount(4);
    await page
      .getByRole('searchbox', { name: 'Search Pokédex' })
      .fill('pikachu');
    await expect(entries).toHaveCount(1);
    await expect(entries.first()).toContainText('No. 0025');
    await page.getByRole('searchbox').fill('nothing matches');
    await expect(page.getByRole('status')).toContainText('No matching entries');
    await page.getByRole('searchbox').fill('');
    await page
      .getByRole('combobox', { name: 'Entries', exact: true })
      .selectOption('missing');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('13–24');
    await page.getByRole('searchbox').fill('#0004');
    await expect(entries).toHaveCount(1);
    await expect(entries.first()).toContainText('Not registered');
    await page.getByRole('searchbox').fill('');
    await page
      .getByRole('combobox', { name: 'Entries', exact: true })
      .selectOption('registered');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Titles', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Trainer Titles' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Pokédex', exact: true }).click();
    await page.reload();
    await expect(
      page.getByText('4 / 1025 registered', { exact: true }),
    ).toBeVisible();
  });
}

test('registers a correct answer immediately even when the round is abandoned', async ({
  page,
}) => {
  const modifiers = {
    ...defaultModifiers,
    generations: [...generations],
    questionTypes: ['type-twins' as const],
    trainingMode: 'custom' as const,
  };
  const seed = 'pokedex-answer';
  const [question] = buildQuestions(
    catalogData as PokemonCatalog,
    modifiers,
    createSeededRandom(seed),
  );
  expect(question).toBeDefined();
  await page.addInitScript(
    ({ data, settings, seed, contentVersion }) => {
      if (localStorage.getItem('quizmon.player')) return;
      localStorage.setItem(
        'quizmon.player',
        JSON.stringify({
          version: 2,
          restoreId: null,
          data: { ...data, settings },
        }),
      );
      sessionStorage.setItem(
        'quizmon.active-game.v1',
        JSON.stringify({
          version: 1,
          playerRestoreId: null,
          answers: [],
          contentVersion,
          elapsedMilliseconds: 0,
          mode: { kind: 'training' },
          modifiers: settings,
          questionCount: 10,
          seed,
        }),
      );
    },
    {
      data: emptyPlayerData(),
      settings: modifiers,
      seed,
      contentVersion: catalogData.contentVersion,
    },
  );
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Type twins', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: new RegExp(formatName(question!.answer.correctOptions[0]!)),
    })
    .click();
  expect(
    await page.evaluate(
      () =>
        (JSON.parse(localStorage.getItem('quizmon.player')!) as PlayerSave).data
          .pokedex,
    ),
  ).toEqual(getQuestionPokemon(question!));
  await page.goto('/?trainer=pokedex');
  await expect(
    page.getByText('2 / 1025 registered', { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (JSON.parse(localStorage.getItem('quizmon.player')!) as PlayerSave).data
          .results.progress.correctPokemon,
    ),
  ).toEqual([]);
});

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'modifiers',
      JSON.stringify({
        generations: ['I'],
        formCategories: ['default'],
        randomSprite: false,
        whosThatPokemon: false,
        isLimitActive: true,
        limit: 1,
        speedrunMode: true,
      }),
    );
  });
});

test('plays a complete one-question game', async ({ page }) => {
  let requestedPokemon = '';

  await page.route('https://pokeapi.co/api/v2/pokemon/**', async (route) => {
    requestedPokemon = route.request().url().split('/').at(-1) ?? '';
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        name: requestedPokemon,
        sprites: {
          front_default:
            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
          other: {},
          versions: {},
        },
      }),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('img', { name: /Quizmon/ })).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();

  await expect(
    page.getByRole('heading', { name: 'Who’s that Pokémon?' }),
  ).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 001');
  await expect.poll(() => requestedPokemon).not.toBe('');

  const answer = requestedPokemon
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  await page.getByRole('button', { name: answer, exact: true }).click();

  await expect(page.getByText('Correct!')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  await expect(page.getByText('100.00%')).toBeVisible();
});

test('keeps modifier actions reachable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Modifiers' }).click();

  const dialog = page.getByRole('dialog', { name: 'Modifiers & filters' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Save modifiers' }),
  ).toBeVisible();
  await expect(dialog.getByText(/Pokémon match these filters/)).toBeVisible();
});

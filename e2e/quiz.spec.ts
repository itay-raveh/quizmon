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

test('publishes complete, non-duplicated site metadata', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Quizmon');
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://quizmon.raveh.dev/',
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://quizmon.raveh.dev/assets/images/social-card.png',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  await expect(page.locator('meta[name^="twitter:"]')).toHaveCount(1);

  const manifestResponse = await page.request.get('/site.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()['content-type']).toContain(
    'application/manifest+json',
  );
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: 'Quizmon',
    description:
      'The ultimate Pokémon knowledge test. Identify Pokémon, tune the challenge, and race the clock.',
    theme_color: '#72c3ee',
  });
});

test('plays a complete one-question game', async ({ page }) => {
  let requestedPokemon = '';
  let requestCount = 0;

  await page.route('https://pokeapi.co/api/v2/pokemon/**', async (route) => {
    requestCount += 1;
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
  await expect.poll(() => requestCount).toBe(1);

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

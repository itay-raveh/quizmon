import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'modifiers',
      JSON.stringify({
        generations: ['I'],
        formCategories: ['default'],
        randomSprite: false,
        soundEnabled: false,
        whosThatPokemon: false,
        isLimitActive: true,
        limit: 1,
        speedrunMode: true,
      }),
    );
  });

  await page.route('https://raw.githubusercontent.com/**', async (route) => {
    await route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    });
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

  const robotsResponse = await page.request.get('/robots.txt');
  expect(robotsResponse.ok()).toBe(true);
  expect(await robotsResponse.text()).toBe('User-agent: *\nAllow: /\n');
});

test('plays and shares a complete one-question game', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined });
  });
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
  await page.getByRole('button', { name: 'Custom game' }).click();

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
  await expect(page.getByText(/New best!/)).toBeVisible();

  await page.getByRole('button', { name: 'Share result' }).click();
  await expect(page.getByText('Result copied to the clipboard.')).toBeVisible();
  const shareText = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareText).toContain('Quizmon · Custom game');
  expect(shareText.toLowerCase()).not.toContain(requestedPokemon);
});

test('prefetches and decodes the next question before advancing', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const modifiers = JSON.parse(
      window.localStorage.getItem('modifiers') ?? '{}',
    ) as Record<string, unknown>;
    window.localStorage.setItem(
      'modifiers',
      JSON.stringify({ ...modifiers, limit: 2 }),
    );
  });

  const requestedPokemon: string[] = [];
  await page.route('https://pokeapi.co/api/v2/pokemon/**', async (route) => {
    const name = route.request().url().split('/').filter(Boolean).at(-1) ?? '';
    requestedPokemon.push(name);
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        name,
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
  await page.getByRole('button', { name: 'Custom game' }).click();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 002');
  await expect.poll(() => requestedPokemon).toHaveLength(2);

  const firstAnswer = requestedPokemon[0]
    ?.split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  expect(firstAnswer).toBeTruthy();
  await page.getByRole('button', { name: firstAnswer, exact: true }).click();

  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('002 / 002');
  expect(requestedPokemon).toHaveLength(2);
});

test('answers questions with the number keys', async ({ page }) => {
  let requestedPokemon = '';
  await page.route('https://pokeapi.co/api/v2/pokemon/**', async (route) => {
    requestedPokemon =
      route.request().url().split('/').filter(Boolean).at(-1) ?? '';
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
  await page.getByRole('button', { name: 'Custom game' }).click();
  await expect.poll(() => requestedPokemon).not.toBe('');

  const answer = requestedPokemon
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const answerButton = page.getByRole('button', { name: answer, exact: true });
  const shortcut = await answerButton.getAttribute('aria-keyshortcuts');
  expect(shortcut).toMatch(/^[1-4]$/);
  await page.keyboard.press(shortcut!);

  await expect(page.getByText('Correct!')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
});

test('keeps modifier actions reachable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Modifiers' }).click();

  const dialog = page.getByRole('dialog', { name: 'Modifiers & filters' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Close modifiers' }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('link', { name: 'TextStudio' }),
  ).not.toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('button', { name: 'Close modifiers' }),
  ).toBeFocused();
  await expect(
    dialog.getByRole('button', { name: 'Save modifiers' }),
  ).toBeVisible();
  await expect(dialog.getByText(/Pokémon match these filters/)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Modifiers' })).toBeFocused();
});

test('opens a deterministic daily challenge from a shared date', async ({
  page,
}) => {
  const requestedPokemon: string[] = [];
  await page.route('https://pokeapi.co/api/v2/pokemon/**', async (route) => {
    const name = route.request().url().split('/').filter(Boolean).at(-1) ?? '';
    requestedPokemon.push(name);
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        name,
        sprites: {
          front_default:
            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
          other: {},
          versions: {},
        },
      }),
    });
  });

  await page.goto('/?daily=2026-09-01');
  await expect(page.getByText('Sep 1, 2026 · 10 questions')).toBeVisible();
  await page.getByRole('button', { name: 'Play daily' }).click();

  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 010');
  await expect(page.getByText(/Daily challenge · Sep 1, 2026/)).toBeVisible();
  await expect.poll(() => requestedPokemon).toHaveLength(2);
  const firstRun = [...requestedPokemon];

  requestedPokemon.length = 0;
  await page.reload();
  await page.getByRole('button', { name: 'Play daily' }).click();
  await expect.poll(() => requestedPokemon).toHaveLength(2);
  expect(requestedPokemon).toEqual(firstRun);
});

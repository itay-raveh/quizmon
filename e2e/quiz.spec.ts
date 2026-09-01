import { expect, test, type Page } from '@playwright/test';
import catalogData from '../src/game/data/pokemon.json' with { type: 'json' };

const imageBody = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const formatName = (name: string) =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const seedBrowserRandom = (page: Page, seed: string) =>
  page.evaluate((value) => {
    let hash = 2166136261;
    for (const character of value) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    let state = hash >>> 0;
    Math.random = () => {
      state += 0x6d2b79f5;
      let next = state;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window.location.search.includes('fresh=1')) return;
    window.localStorage.setItem(
      'quizmon.training-settings.v2',
      JSON.stringify({
        generations: ['I'],
        questionTypes: ['pokedex-scan'],
        soundEnabled: false,
        isLimitActive: true,
        limit: 1,
        speedrunMode: true,
      }),
    );
  });

  await page.route('https://raw.githubusercontent.com/**', async (route) => {
    await route.fulfill({ contentType: 'image/png', body: imageBody });
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
      'Take a new ten-question Pokémon Trainer Trial every day, then practice types, moves, evolutions, stats, and more.',
    theme_color: '#72c3ee',
  });

  const robotsResponse = await page.request.get('/robots.txt');
  expect(robotsResponse.ok()).toBe(true);
  expect(await robotsResponse.text()).toBe('User-agent: *\nAllow: /\n');
});

test('plays and shares a complete Training question without a live API call', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-write']);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined });
  });
  let apiCalls = 0;
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    apiCalls += 1;
    await route.abort();
  });

  await page.goto('/');
  await seedBrowserRandom(page, 'visual-identity-2');
  await expect(page.getByRole('img', { name: /Quizmon/ })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await page.getByRole('button', { name: 'Start training' }).click();

  await expect(
    page.getByRole('heading', { name: 'Pokédex scan' }),
  ).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 001');
  await expect(page.getByRole('contentinfo')).toBeVisible();
  const src = await page
    .getByRole('img', { name: /Pokémon/ })
    .getAttribute('src');
  const pokemon = Object.entries(catalogData.pokemon).find(
    ([, entry]) => entry.sprite === src,
  )?.[0];
  expect(pokemon).toBeTruthy();

  await page
    .getByRole('button', { name: formatName(pokemon!), exact: true })
    .click();
  await expect(page.getByText(/Correct! \+[\d,]+ points/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Training complete' }),
  ).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Experience' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Close settings' }).click();
  expect(apiCalls).toBe(0);

  await page.getByRole('button', { name: 'Share result' }).click();
  const shareDialog = page.getByRole('dialog', { name: 'Share result' });
  await expect(shareDialog).toBeVisible();
  await expect(
    shareDialog.getByRole('button', { name: 'WhatsApp' }),
  ).toBeVisible();
  await expect(
    shareDialog.getByRole('button', { name: 'Telegram' }),
  ).toBeVisible();
  await expect(
    shareDialog.getByRole('button', { name: 'Bluesky' }),
  ).toBeVisible();
  await shareDialog.getByRole('button', { name: 'Copy result' }).click();
  await expect(shareDialog.getByText('Result copied.')).toBeVisible();
});

test('asks new players which generations they know before Training', async ({
  page,
}) => {
  await page.goto('/?fresh=1');

  await page.getByRole('button', { name: 'Start training' }).click();
  const prompt = page.getByRole('dialog', {
    name: 'Which Pokémon do you know?',
  });
  await expect(prompt).toBeVisible();
  await expect(
    prompt.getByText('You can change this later in Settings.'),
  ).toBeVisible();

  await prompt.getByRole('button', { name: /Gen I only/ }).click();
  await expect(prompt).toBeHidden();
  await expect(page.locator('.question')).toBeVisible();

  await page.getByRole('button', { name: 'Leave game' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings.getByLabel('I', { exact: true })).toBeChecked();
  await expect(settings.getByLabel('II', { exact: true })).not.toBeChecked();
});

test('answers questions with the number keys', async ({ page }) => {
  await page.goto('/');
  await seedBrowserRandom(page, 'visual-identity-2');
  await page.getByRole('button', { name: 'Start training' }).click();

  const image = page.getByRole('img', { name: /Pokémon/ });
  const src = await image.getAttribute('src');
  const pokemon = Object.entries(catalogData.pokemon).find(
    ([, entry]) => entry.sprite === src,
  )?.[0];
  const answer = page.getByRole('button', {
    name: formatName(pokemon!),
    exact: true,
  });
  const shortcut = await answer.getAttribute('aria-keyshortcuts');
  expect(shortcut).toMatch(/^[1-4]$/);
  await page.keyboard.press(shortcut!);

  await expect(
    page.getByRole('heading', { name: 'Training complete' }),
  ).toBeVisible();
});

test('keeps grouped settings reachable throughout a game on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();

  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Close settings' }),
  ).toBeFocused();
  await expect(
    dialog.getByRole('button', { name: 'Save settings' }),
  ).toBeVisible();
  await expect(dialog.getByRole('tab', { name: 'Training' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const selectAllGenerations = dialog.getByRole('button', {
    name: 'Select all generations',
  });
  await selectAllGenerations.click();
  await expect(dialog.getByLabel('IX', { exact: true })).toBeChecked();
  await dialog
    .getByRole('button', { name: 'Deselect all generations' })
    .click();
  await expect(dialog.getByLabel('I', { exact: true })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Select all generations' }).click();
  await dialog
    .getByRole('button', { name: 'Select all question types' })
    .click();
  await expect(dialog.getByLabel('Evolution order')).toBeChecked();
  await expect(dialog.getByLabel('Odd one out')).toBeChecked();
  await expect(dialog.getByLabel('Missing evolution')).toHaveCount(0);
  await dialog
    .getByRole('button', { name: 'Deselect all question types' })
    .click();
  await expect(dialog.getByLabel('Pokédex scan')).not.toBeChecked();
  await dialog
    .getByRole('button', { name: 'Select all question types' })
    .click();
  await dialog.getByRole('tab', { name: 'Experience' }).click();
  await expect(dialog.getByText('Play experience')).toBeVisible();
  await expect(dialog.getByLabel('Speedrun mode')).toBeVisible();
  await dialog.getByRole('tab', { name: 'Experience' }).press('ArrowLeft');
  await expect(dialog.getByRole('tab', { name: 'Training' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused();

  await page.getByRole('button', { name: 'Start training' }).click();
  const timer = page.locator('.timer');
  await expect
    .poll(() => timer.getAttribute('aria-label'))
    .not.toBe('Elapsed time 00:00:00');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('tab', { name: 'Experience' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const pausedAt = await timer.getAttribute('aria-label');
  await page.waitForTimeout(1100);
  await expect(timer).toHaveAttribute('aria-label', pausedAt!);
  await dialog.getByRole('tab', { name: 'Training' }).click();
  await expect(
    dialog.getByText('Training changes apply to your next game.'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect.poll(() => timer.getAttribute('aria-label')).not.toBe(pausedAt);

  await page.setViewportSize({ width: 320, height: 844 });
  const footerMetrics = await page
    .getByRole('contentinfo')
    .evaluate((footer) => ({
      clientWidth: footer.clientWidth,
      scrollWidth: footer.scrollWidth,
      childTops: [...footer.children]
        .filter((child) => !child.classList.contains('visually-hidden'))
        .map((child) => Math.round(child.getBoundingClientRect().top)),
    }));
  expect(new Set(footerMetrics.childTops).size).toBe(1);
  expect(footerMetrics.scrollWidth).toBeLessThanOrEqual(
    footerMetrics.clientWidth,
  );
});

test('shows a saved daily score instead of another play button', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {
          '2026-09-01': {
            answers: Array.from({ length: 10 }, (_, index) => ({
              category: index === 9 ? 'champion' : 'identity',
              correct: index < 8,
              points: index < 8 ? 100 : 0,
            })),
            contentVersion: 2,
            correctCount: 8,
            elapsedSeconds: 90,
            questionCount: 10,
            score: 800,
          },
        },
        training: {},
      }),
    );
  });

  await page.goto('/?daily=2026-09-01');
  await expect(page.getByText('Daily complete')).toBeVisible();
  await expect(page.getByText('Sep 1, 2026 · 14,400 points')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play daily' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
});

test('syncs a completed daily across open tabs', async ({ context, page }) => {
  const otherPage = await context.newPage();
  await Promise.all([
    page.goto('/?daily=2026-09-01'),
    otherPage.goto('/?daily=2026-09-01'),
  ]);
  await expect(
    otherPage.getByRole('button', { name: 'Play daily' }),
  ).toBeVisible();

  await page.evaluate(() => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {
          '2026-09-01': {
            answers: Array.from({ length: 10 }, (_, index) => ({
              category: index === 9 ? 'champion' : 'identity',
              correct: true,
              points: 100,
            })),
            contentVersion: 2,
            correctCount: 10,
            elapsedSeconds: 70,
            questionCount: 10,
            score: 1000,
          },
        },
        training: {},
      }),
    );
  });

  await expect(otherPage.getByText('Daily complete')).toBeVisible();
  await expect(
    otherPage.getByRole('button', { name: 'Play daily' }),
  ).toHaveCount(0);
});

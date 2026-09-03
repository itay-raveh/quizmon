import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
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

  await page.route('**/sprites/pokemon/**', async (route) => {
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
  await expect(
    page.locator('link[rel="alternate"][type="text/markdown"]'),
  ).toHaveAttribute('href', 'https://quizmon.raveh.dev/index.md');
  await expect(page.locator('link[rel="describedby"]')).toHaveAttribute(
    'href',
    'https://quizmon.raveh.dev/llms.txt',
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

  const footerMetrics = await page
    .getByRole('contentinfo')
    .evaluate((footer) => ({
      fontSize: Number.parseFloat(getComputedStyle(footer).fontSize),
      lineTops: [...footer.children]
        .filter((child) => !child.classList.contains('visually-hidden'))
        .map((child) => Math.round(child.getBoundingClientRect().top)),
    }));
  expect(footerMetrics.fontSize).toBeGreaterThanOrEqual(14);
  expect(new Set(footerMetrics.lineTops).size).toBe(1);

  const structuredData: unknown = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      '{}',
  );
  expect(structuredData).toMatchObject({
    '@type': ['VideoGame', 'WebApplication'],
    name: 'Quizmon',
    url: 'https://quizmon.raveh.dev/',
    applicationCategory: 'GameApplication',
    isAccessibleForFree: true,
    offers: { price: 0 },
  });

  const manifestResponse = await page.request.get('/site.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()['content-type']).toContain(
    'application/manifest+json',
  );
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: 'Quizmon',
    description:
      'Take the five-question Pokémon Daily Challenge each day, then practice types, moves, evolutions, stats, and more.',
    display: 'standalone',
    icons: [
      {
        purpose: 'any',
        sizes: '192x192',
        src: '/pwa-192x192.png',
      },
      {
        purpose: 'any',
        sizes: '512x512',
        src: '/pwa-512x512.png',
      },
      {
        purpose: 'maskable',
        sizes: '512x512',
        src: '/pwa-maskable-512x512.png',
      },
    ],
    theme_color: '#72c3ee',
  });

  const serviceWorkerResponse = await page.request.get('/sw.js');
  expect(serviceWorkerResponse.ok()).toBe(true);
  expect(await serviceWorkerResponse.text()).toContain(
    'quizmon-pokemon-sprites',
  );

  const robotsResponse = await page.request.get('/robots.txt');
  expect(robotsResponse.ok()).toBe(true);
  expect(await robotsResponse.text()).toBe(
    'User-agent: *\nAllow: /\n\nSitemap: https://quizmon.raveh.dev/sitemap.xml\n',
  );

  const sitemapResponse = await page.request.get('/sitemap.xml');
  expect(sitemapResponse.ok()).toBe(true);
  expect(await sitemapResponse.text()).toContain(
    '<loc>https://quizmon.raveh.dev/</loc>',
  );

  const llmsResponse = await page.request.get('/llms.txt');
  expect(llmsResponse.ok()).toBe(true);
  expect(await llmsResponse.text()).toContain(
    '[Quizmon overview](https://quizmon.raveh.dev/index.md)',
  );

  const markdownResponse = await page.request.get('/index.md');
  expect(markdownResponse.ok()).toBe(true);
  const readme = await readFile(
    new URL('../README.md', import.meta.url),
    'utf8',
  );
  expect(await markdownResponse.text()).toBe(readme);
});

test("keeps today's Daily Challenge action concise", async ({ page }) => {
  await page.goto('/');

  const today = page.getByRole('button', { name: /Play Daily Challenge/ });
  await expect(today).toBeVisible();
  await expect(today.locator('.daily-action__detail')).toHaveCount(0);

  await page.goto('/?daily=2026-09-01');
  const historical = page.getByRole('button', {
    name: /Play Daily Challenge for Sep 1, 2026/,
  });
  await expect(historical.locator('.daily-action__detail')).toHaveText(
    'Sep 1, 2026',
  );
});

test('loads the installed app shell and catalog offline', async ({
  context,
  page,
}) => {
  await page.goto('/');

  const serviceWorkerUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });
  expect(serviceWorkerUrl).toBe('http://127.0.0.1:4173/sw.js');

  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Quizmon' })).toBeVisible();
    const dailyChallenge = page.getByRole('button', {
      name: /Play Daily Challenge/,
    });
    await expect(dailyChallenge).toBeEnabled();
    await expect(dailyChallenge).not.toContainText('5 questions');
  } finally {
    await context.setOffline(false);
  }
});

test('plays and shares a complete Training question without a live API call', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await context.grantPermissions(['clipboard-write']);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined });
  });
  let apiCalls = 0;
  const completionEvents: unknown[] = [];
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    apiCalls += 1;
    await route.abort();
  });
  await page.route('**/api/events/game-completed', async (route) => {
    completionEvents.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });

  await page.goto('/');
  await seedBrowserRandom(page, 'visual-identity-2');
  await expect(page.getByRole('img', { name: /Quizmon/ })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await page.getByRole('button', { name: 'Start training' }).click();

  await expect(
    page.getByRole('heading', { name: 'Pokédex scan' }),
  ).toBeVisible();
  const spriteFrame = await page.locator('.sprite-frame').boundingBox();
  const leaveGame = await page
    .getByRole('button', { name: 'Leave game' })
    .boundingBox();
  expect(spriteFrame?.height).toBeLessThanOrEqual(161);
  expect(leaveGame?.y).toBeGreaterThan(0);
  expect(leaveGame!.y + leaveGame!.height).toBeLessThanOrEqual(640);
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

  const answer = page.getByRole('button', {
    name: formatName(pokemon!),
    exact: true,
  });
  await answer.click();
  await expect(answer).toHaveClass(/answer--correct/);
  await expect(page.getByText(/\+[\d,]+ points/)).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Training complete' }),
  ).toBeVisible();
  await expect.poll(() => completionEvents).toHaveLength(1);
  expect(completionEvents[0]).toMatchObject({
    contentVersion: catalogData.contentVersion,
    correctCount: 1,
    mode: 'training',
    questionCount: 1,
    scoreVersion: 2,
  });
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

test('keeps reverse-silhouette rounds clear on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.training-settings.v2',
      JSON.stringify({
        generations: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'],
        questionTypes: ['silhouette-match'],
        soundEnabled: false,
        isLimitActive: true,
        limit: 1,
        speedrunMode: true,
      }),
    );
  });

  await page.goto('/');
  await seedBrowserRandom(page, 'mobile-silhouette-match');
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(
    page.getByRole('heading', { name: 'Silhouette match' }),
  ).toBeVisible();

  const prompt = page.locator('.question__prompt');
  const promptBox = await prompt.boundingBox();
  const answersBox = await page.locator('.answers').boundingBox();
  const leaveBox = await page
    .getByRole('button', { name: 'Leave game' })
    .boundingBox();

  expect(promptBox?.width).toBeGreaterThan(300);
  expect(answersBox).not.toBeNull();
  expect(leaveBox).not.toBeNull();
  expect(leaveBox!.y - (answersBox!.y + answersBox!.height)).toBeGreaterThan(
    12,
  );

  await page.getByRole('button', { name: 'Silhouette 1' }).click();
  await expect(page.locator('.answer-explanation')).toHaveCount(0);
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

test('repeats Training immediately with the same configuration', async ({
  page,
}) => {
  await page.goto('/');
  await seedBrowserRandom(page, 'training-rematch');
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(
    page.getByRole('heading', { name: 'Pokédex scan' }),
  ).toBeVisible();
  await page.locator('.answer').first().click();

  await expect(
    page.getByRole('heading', { name: 'Training complete' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Trainer Card updated/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Train again' }).click();

  await expect(
    page.getByRole('heading', { name: 'Pokédex scan' }),
  ).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 001');
});

test('keeps a customizable two-sided Trainer Card on this device', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Trainer Card' }).click();

  await expect(page).toHaveURL(/\?trainer=1$/);
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toBeVisible();
  await expect(page.getByText('Your profile')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Copy Quizmon link' }),
  ).toHaveCount(0);
  const backWidth = await page
    .getByRole('button', { name: 'Back' })
    .evaluate((button) => button.getBoundingClientRect().width);
  expect(backWidth).toBeLessThanOrEqual(48);
  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByRole('textbox', { name: 'Trainer name' }).fill('Leaf');
  await page.getByRole('combobox', { name: 'Partner Pokémon' }).fill('Pikachu');
  await expect(
    page.getByRole('option', { name: 'Pikachu' }).locator('img'),
  ).toHaveAttribute('src', '/sprites/pokemon/25.png');
  await page.getByRole('option', { name: 'Pikachu' }).click();
  await page.getByRole('button', { name: 'Save card' }).click();

  const card = page.getByRole('article', { name: 'Trainer Card front' });
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await expect(page.getByText('Pikachu')).toBeVisible();
  const downloadButton = page.getByRole('button', { name: 'Download PNG' });
  await expect(downloadButton).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Share card' })).toHaveCount(0);
  const cardBounds = await card.boundingBox();
  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!cardBounds) throw new Error('Trainer Card bounds are unavailable');
  const png = await readFile(downloadPath);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(Math.abs(png.readUInt32BE(16) - cardBounds.width * 2)).toBeLessThan(4);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: ({ files }: ShareData) => Boolean(files?.length),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => Promise.resolve(),
    });
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Share card' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'View records' }).click();
  await expect(
    page.getByRole('article', { name: 'Trainer Card records' }),
  ).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL('/');
  const settingsButton = page.getByRole('button', { name: 'Settings' });
  const trainerButton = page.getByRole('button', { name: 'Trainer Card' });
  const trainingButton = page.getByRole('button', { name: 'Start training' });
  await expect(trainerButton.locator('img')).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 720 });
  const controlStyles = await Promise.all(
    [settingsButton, trainerButton, trainingButton].map((button) =>
      button.evaluate((element) => {
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          height: bounds.height,
          top: bounds.top,
        };
      }),
    ),
  );
  expect(controlStyles[0]).toEqual(controlStyles[1]);
  expect(controlStyles[1]).toEqual(controlStyles[2]);
  await page.setViewportSize({ width: 768, height: 900 });
  const intermediateFontSize = await trainerButton.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  );
  expect(intermediateFontSize).toBeGreaterThanOrEqual(14);
});

test('confirms before discarding an in-progress game', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.training-settings.v2',
      JSON.stringify({
        generations: ['I'],
        questionTypes: ['pokedex-scan'],
        soundEnabled: false,
        isLimitActive: true,
        limit: 2,
        speedrunMode: true,
      }),
    );
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Start training' }).click();
  await page.locator('.answer').first().click();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('002 / 002');

  await page.getByRole('button', { name: 'Leave game' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Leave this game?' });
  await expect(confirmation).toBeVisible();
  await expect(
    confirmation.getByRole('button', { name: 'Keep playing' }),
  ).toBeFocused();

  const timer = page.locator('.timer');
  const pausedAt = await timer.getAttribute('aria-label');
  await page.waitForTimeout(500);
  await expect(timer).toHaveAttribute('aria-label', pausedAt!);

  await page.keyboard.press('Escape');
  await expect(confirmation).toBeHidden();
  await expect.poll(() => timer.getAttribute('aria-label')).not.toBe(pausedAt);

  await page.getByRole('button', { name: 'Leave game' }).click();
  await confirmation.getByRole('button', { name: 'Leave game' }).click();
  await expect(
    page.getByRole('button', { name: 'Start training' }),
  ).toBeVisible();
});

test('restores the next unanswered question after a reload', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.training-settings.v2',
      JSON.stringify({
        generations: ['I'],
        questionTypes: ['pokedex-scan'],
        soundEnabled: false,
        isLimitActive: true,
        limit: 2,
        speedrunMode: false,
      }),
    );
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 002');

  await page.locator('.answer').first().click();
  await page.reload();

  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('002 / 002');
  await expect(page.getByText('Training', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Leave game' })).toBeVisible();
});

test('keeps grouped settings reachable throughout a game on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();

  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Settings' })).toBeFocused();
  await expect(
    dialog.getByRole('button', { name: 'Save settings' }),
  ).toBeVisible();
  await expect(dialog.getByRole('contentinfo')).toHaveCount(0);
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
  const identityGroup = dialog.getByRole('button', {
    name: 'Identity 5 / 5 selected',
  });
  const knowledgeGroup = dialog.getByRole('button', {
    name: 'General knowledge 5 / 5 selected',
  });
  const battleGroup = dialog.getByRole('button', {
    name: 'Battle knowledge 5 / 5 selected',
  });
  await expect(identityGroup).toHaveAttribute('aria-expanded', 'true');
  await expect(knowledgeGroup).toHaveAttribute('aria-expanded', 'false');
  await expect(battleGroup).toHaveAttribute('aria-expanded', 'false');
  await battleGroup.click();
  await expect(identityGroup).toHaveAttribute('aria-expanded', 'false');
  await expect(battleGroup).toHaveAttribute('aria-expanded', 'true');
  await expect(
    dialog.getByRole('group', { name: 'Battle knowledge question types' }),
  ).toBeVisible();
  await expect(dialog.getByLabel('Battle view')).toBeChecked();
  await expect(dialog.getByLabel('Counter pick')).toBeChecked();
  await expect(dialog.getByLabel('Evolution shift')).toBeChecked();
  await expect(dialog.getByLabel('Evolution trail')).toHaveCount(0);
  await expect(dialog.getByLabel('Evolution order')).toHaveCount(0);
  await expect(dialog.getByLabel('Odd one out')).toBeChecked();
  await expect(dialog.getByLabel('Missing evolution')).toHaveCount(0);
  await dialog
    .getByRole('button', { name: 'Deselect all question types' })
    .click();
  await expect(dialog.getByLabel('Pokédex scan')).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Save settings' }).click();
  await expect(
    dialog.getByText('Choose at least one question type.'),
  ).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Question types' }),
  ).toBeFocused();
  await dialog
    .getByRole('button', { name: 'Select all question types' })
    .click();
  await expect(
    dialog.getByText('Choose at least one question type.'),
  ).toHaveCount(0);
  await dialog.getByRole('tab', { name: 'Experience' }).click();
  await expect(dialog.getByText('Play experience')).toBeVisible();
  await expect(dialog.getByLabel('Quick transitions')).toBeVisible();
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
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: 'Training' }).click();
  const mobileControlMetrics = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const close = element
      .querySelector('.dialog-close')
      ?.getBoundingClientRect();
    const selectionToggle = element
      .querySelector('.selection-toggle')
      ?.getBoundingClientRect();
    const numberInput = element
      .querySelector('.number-field input')
      ?.getBoundingClientRect();
    const description = element.querySelector('.selection-tile__description');
    return {
      closeHeight: close?.height,
      closeWidth: close?.width,
      descriptionFontSize: description
        ? Number.parseFloat(getComputedStyle(description).fontSize)
        : undefined,
      dialogHeight: bounds.height,
      dialogWidth: bounds.width,
      numberInputHeight: numberInput?.height,
      selectionToggleHeight: selectionToggle?.height,
    };
  });
  expect(mobileControlMetrics.dialogHeight).toBe(844);
  expect(mobileControlMetrics.dialogWidth).toBe(320);
  expect(mobileControlMetrics.closeHeight).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.closeWidth).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.descriptionFontSize).toBeGreaterThanOrEqual(12);
  expect(mobileControlMetrics.selectionToggleHeight).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.numberInputHeight).toBeGreaterThanOrEqual(44);
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  const footerMetrics = await page
    .getByRole('contentinfo')
    .evaluate((footer) => ({
      clientWidth: footer.clientWidth,
      fontSize: Number.parseFloat(getComputedStyle(footer).fontSize),
      scrollWidth: footer.scrollWidth,
      childTops: [...footer.children]
        .filter((child) => !child.classList.contains('visually-hidden'))
        .map((child) => Math.round(child.getBoundingClientRect().top)),
    }));
  expect(new Set(footerMetrics.childTops).size).toBe(1);
  expect(footerMetrics.fontSize).toBeGreaterThanOrEqual(14);
  expect(footerMetrics.scrollWidth).toBeLessThanOrEqual(
    footerMetrics.clientWidth,
  );
  const renderedFooterText = await page
    .getByRole('contentinfo')
    .evaluate((footer) =>
      [...footer.children]
        .filter((child) => !child.classList.contains('visually-hidden'))
        .map((child) => (child as HTMLElement).innerText.trim())
        .join(' '),
    );
  expect(renderedFooterText).toBe('Logo: TextStudio · Data: PokéAPI · GitHub');
});

test('shows a saved daily score instead of another play button', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        window.sessionStorage.setItem(
          'quizmon.test-share',
          JSON.stringify(data),
        );
        return Promise.resolve();
      },
    });
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
  await expect(page.getByText('14,400 points · Share')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: /Daily complete.*Share/ }).click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const data = window.sessionStorage.getItem('quizmon.test-share');
        return data ? (JSON.parse(data) as ShareData).text : undefined;
      }),
    )
    .toContain('https://quizmon.raveh.dev/?daily=2026-09-01&play=1');

  const sharedText = await page.evaluate(() => {
    const data = window.sessionStorage.getItem('quizmon.test-share');
    return data ? (JSON.parse(data) as ShareData).text : undefined;
  });
  const sharedUrl = sharedText?.split('\n').at(-1);
  expect(sharedUrl).toBe('https://quizmon.raveh.dev/?daily=2026-09-01&play=1');
  const { pathname, search } = new URL(sharedUrl!);
  await page.goto(`${pathname}${search}`);
  await expect(page.getByText('14,400 points · Share')).toBeVisible();
});

test('starts the selected daily challenge from a shared link', async ({
  page,
}) => {
  await page.goto('/?daily=2026-09-01&play=1');

  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 005');
  await expect(page.getByText('Daily Challenge · Sep 1, 2026')).toBeVisible();
});

test("shows a legacy Daily Combo on today's challenge", async ({ page }) => {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const date = yesterday.toISOString().slice(0, 10);

  await page.setViewportSize({ width: 320, height: 700 });

  await page.addInitScript(
    ({ dailyDate }) => {
      window.localStorage.setItem(
        'quizmon.results.v2',
        JSON.stringify({
          daily: {
            [dailyDate]: {
              answers: [],
              contentVersion: 2,
              correctCount: 0,
              elapsedSeconds: 10,
              questionCount: 5,
              score: 0,
              scoreVersion: 2,
            },
          },
          training: {},
        }),
      );
    },
    { dailyDate: date },
  );

  await page.goto('/');

  await expect(
    page.getByRole('img', { name: '1-day Daily Combo' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: /Play Daily Challenge.*1-day Daily Combo/,
    }),
  ).toBeVisible();

  const mobileBounds = await page.evaluate(() => {
    const action = document
      .querySelector('.daily-action')
      ?.getBoundingClientRect();
    const label = document
      .querySelector('.daily-action .catch-combo__label')
      ?.getBoundingClientRect();

    return action && label
      ? { actionRight: action.right, labelRight: label.right }
      : null;
  });
  expect(mobileBounds).not.toBeNull();
  expect(mobileBounds!.actionRight - mobileBounds!.labelRight).toBeGreaterThan(
    8,
  );

  await page.setViewportSize({ width: 591, height: 844 });
  await expect(page.locator('.daily-action')).toHaveCSS('width', '288px');

  const footerLines = await page
    .locator('.site-footer')
    .evaluate(
      (footer) =>
        new Set(
          [...footer.children]
            .filter((child) => !child.classList.contains('visually-hidden'))
            .map((child) => Math.round(child.getBoundingClientRect().top)),
        ).size,
    );
  expect(footerLines).toBe(1);
});

test('syncs a completed daily across open tabs', async ({ context, page }) => {
  const otherPage = await context.newPage();
  await Promise.all([
    page.goto('/?daily=2026-09-01'),
    otherPage.goto('/?daily=2026-09-01'),
  ]);
  await expect(
    otherPage.getByRole('button', { name: /Play Daily Challenge/ }),
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
    otherPage.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toHaveCount(0);
});

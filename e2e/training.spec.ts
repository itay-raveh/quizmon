import {
  catalogData,
  expect,
  formatName,
  seedBrowserRandom,
  test,
} from './fixtures';

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

  await seedBrowserRandom(page, 'visual-identity-2');
  await page.goto('/');
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
        limit: 1,
        speedrunMode: true,
      }),
    );
  });

  await seedBrowserRandom(page, 'mobile-silhouette-match');
  await page.goto('/');
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
  expect(leaveBox!.y).toBeLessThan(promptBox!.y);
  expect(leaveBox!.width).toBeGreaterThanOrEqual(44);
  expect(leaveBox!.height).toBeGreaterThanOrEqual(44);

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
  await seedBrowserRandom(page, 'visual-identity-2');
  await page.goto('/');
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
  await seedBrowserRandom(page, 'training-rematch');
  await page.goto('/');
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(
    page.getByRole('heading', { name: 'Pokédex scan' }),
  ).toBeVisible();
  await page.locator('.answer').first().click();

  await expect(
    page.getByRole('heading', { name: 'Training complete' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Train again' }).click();

  await expect(
    page.getByRole('heading', { name: 'Pokédex scan' }),
  ).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 001');
});

test('confirms before discarding an in-progress game', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.training-settings.v2',
      JSON.stringify({
        generations: ['I'],
        questionTypes: ['pokedex-scan'],
        soundEnabled: false,
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

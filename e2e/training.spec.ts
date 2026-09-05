import {
  catalogData,
  expect,
  formatName,
  seedBrowserRandom,
  test,
} from './fixtures';
import type { Page } from '@playwright/test';

type PokemonName = keyof typeof catalogData.pokemon;

const findPokemonForSprite = (src: string | null) =>
  Object.entries(catalogData.pokemon).find(
    ([, entry]) =>
      entry.sprite === src ||
      entry.identitySprites.currentBack === src ||
      entry.identitySprites.dreamWorld === src ||
      entry.identitySprites.home === src ||
      entry.identitySprites.officialArtwork === src ||
      entry.identitySprites.showdownBack === src ||
      entry.identitySprites.showdownFront === src ||
      entry.identitySprites.historicalFront.some(
        (candidate) => candidate === src,
      ) ||
      entry.identitySprites.historicalBack.some(
        (candidate) => candidate === src,
      ),
  )?.[0] as PokemonName | undefined;

const answerPokedexQuestion = async (
  page: Page,
  method: 'click' | 'keyboard' = 'click',
) => {
  const src = await page
    .getByRole('img', { name: /Pokémon/ })
    .getAttribute('src');
  const pokemon = findPokemonForSprite(src);
  if (!pokemon) throw new Error(`No Pokémon found for sprite ${src}.`);

  const answer = page.getByRole('button', {
    name: formatName(pokemon),
    exact: true,
  });
  if (method === 'keyboard') {
    const shortcut = await answer.getAttribute('aria-keyshortcuts');
    if (!shortcut) throw new Error('Answer has no keyboard shortcut.');
    await page.keyboard.press(shortcut);
  } else {
    await answer.click();
  }
  return answer;
};

test('plays and shares a complete Training round without a live API call', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await context.grantPermissions(['clipboard-write']);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined });
  });
  let apiCalls = 0;
  const analyticsEvents: Record<string, unknown>[] = [];
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    apiCalls += 1;
    await route.abort();
  });
  await page.route('**/api/events', async (route) => {
    const event = route.request().postDataJSON() as unknown;
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new Error('Expected an analytics event object.');
    }
    analyticsEvents.push(event as Record<string, unknown>);
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
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 010');
  await expect(page.getByRole('contentinfo')).toBeVisible();
  const answer = await answerPokedexQuestion(page, 'keyboard');
  await expect(answer).toHaveClass(/answer--correct/);
  await expect(page.getByText(/\+[\d,]+ points/)).toHaveCount(0);
  for (let number = 2; number <= 10; number += 1) {
    await expect(
      page.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toHaveText(`${String(number).padStart(3, '0')} / 010`);
    await answerPokedexQuestion(page);
  }
  await expect(
    page.getByRole('heading', { name: 'Training complete' }),
  ).toBeVisible();
  await expect
    .poll(() => analyticsEvents.filter(({ type }) => type === 'page_view'))
    .toHaveLength(1);
  await expect
    .poll(() => analyticsEvents.filter(({ type }) => type === 'game_started'))
    .toHaveLength(1);
  const completionEvents = analyticsEvents.filter(
    ({ type }) => type === 'game_completed',
  );
  await expect.poll(() => completionEvents).toHaveLength(1);
  expect(completionEvents[0]).toMatchObject({
    contentVersion: catalogData.contentVersion,
    correctCount: 10,
    mode: 'training',
    questionCount: 10,
    scoreVersion: 2,
    type: 'game_completed',
  });
  await expect(page.getByRole('contentinfo')).toBeVisible();
  expect(apiCalls).toBe(0);

  await page.getByRole('button', { name: 'Share result' }).click();
  const shareDialog = page.getByRole('dialog', { name: 'Share result' });
  await expect(shareDialog).toBeVisible();
  await shareDialog.getByRole('button', { name: 'Copy result' }).click();
  await expect(shareDialog.getByText('Result copied.')).toBeVisible();
  await shareDialog
    .getByRole('button', { name: 'Close share options' })
    .click();

  await page.getByRole('button', { name: 'Train again' }).click();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 010');
});

test('keeps type reveals usable at 200% text', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.training-settings.v2',
      JSON.stringify({
        generations: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'],
        questionTypes: ['type-roundup'],
        soundEnabled: false,
        speedrunMode: false,
        trainingMode: 'custom',
      }),
    );
  });

  await seedBrowserRandom(page, 'stable-type-roundup');
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(
    page.getByRole('heading', { name: 'Type roundup' }),
  ).toBeVisible();
  const typeRows = page.locator('.answer__types');
  await expect(typeRows).toHaveCount(4);
  for (const typeRow of await typeRows.all()) {
    await expect(typeRow).toBeHidden();
  }

  const prompt = await page.locator('#question-prompt').textContent();
  const targetType = prompt
    ?.match(/every (.+)-type Pokémon/)?.[1]
    ?.toLowerCase();
  if (!targetType) throw new Error('Type Roundup prompt has no target type.');

  const answers = page.locator('.answer');
  for (let index = 0; index < (await answers.count()); index += 1) {
    const answer = answers.nth(index);
    const src = await answer.locator('.answer__sprite').getAttribute('src');
    const pokemon = findPokemonForSprite(src);
    if (!pokemon) throw new Error(`No Pokémon found for sprite ${src}.`);
    if (catalogData.pokemon[pokemon].types.includes(targetType)) {
      await answer.click();
    }
  }

  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(
    page.getByRole('button', { name: 'Next question' }),
  ).toBeVisible();
  for (const typeRow of await typeRows.all()) {
    await expect(typeRow).toBeVisible();
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
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
  await expect(prompt.locator('.generation-prompt__sprite')).toHaveCount(6);
  await expect(
    prompt.locator('img[src="/sprites/pokemon/25.png"]'),
  ).toHaveCount(2);
  await expect(
    prompt.locator('img[src="/sprites/pokemon/823.png"]'),
  ).toHaveCount(1);
  await expect(
    prompt.locator('img[src="/sprites/pokemon/959.png"]'),
  ).toHaveCount(1);

  await prompt.getByRole('button', { name: /Gen I only/ }).click();
  await expect(prompt).toBeHidden();
  await expect(page.locator('.question')).toBeVisible();

  await page.getByRole('button', { name: 'Leave game' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings.getByLabel('I', { exact: true })).toBeChecked();
  await expect(settings.getByLabel('II', { exact: true })).not.toBeChecked();
});

test('confirms before discarding an in-progress game', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.training-settings.v2',
      JSON.stringify({
        generations: ['I'],
        questionTypes: ['pokedex-scan'],
        soundEnabled: false,
        speedrunMode: true,
        trainingMode: 'custom',
      }),
    );
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Start training' }).click();
  await page.locator('.answer').first().click();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('002 / 010');

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
        speedrunMode: false,
        trainingMode: 'custom',
      }),
    );
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 010');

  await page.locator('.answer').first().click();
  await page.reload();

  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('002 / 010');
  await expect(page.getByText('Training', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Leave game' })).toBeVisible();
});

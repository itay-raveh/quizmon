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
      entry.identitySprites.historicalFront.some(
        (candidate) => candidate === src,
      ) ||
      entry.identitySprites.historicalBack.some(
        (candidate) => candidate === src,
      ),
  )?.[0] as PokemonName | undefined;

const answerPokedexQuestion = async (page: Page) => {
  const src = await page
    .getByRole('img', { name: /Pokémon/ })
    .getAttribute('src');
  const pokemon = findPokemonForSprite(src);
  if (!pokemon) throw new Error(`No Pokémon found for sprite ${src}.`);

  const answer = page.getByRole('button', {
    name: formatName(pokemon),
    exact: true,
  });
  await answer.click();
  return answer;
};

const completePokedexRound = async (page: Page) => {
  for (let number = 1; number <= 10; number += 1) {
    await expect(
      page.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toHaveText(`${String(number).padStart(3, '0')} / 010`);
    await answerPokedexQuestion(page);
  }
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
  ).toHaveText('001 / 010');
  await expect(page.getByRole('contentinfo')).toBeVisible();
  const answer = await answerPokedexQuestion(page);
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
  await expect.poll(() => completionEvents).toHaveLength(1);
  expect(completionEvents[0]).toMatchObject({
    contentVersion: catalogData.contentVersion,
    correctCount: 10,
    mode: 'training',
    questionCount: 10,
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
        speedrunMode: true,
        trainingMode: 'custom',
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

for (const textScale of ['100%', '200%'] as const) {
  test(`keeps type reveals and the next action stable at ${textScale} text`, async ({
    page,
  }) => {
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
    await page.evaluate((fontSize) => {
      document.documentElement.style.fontSize = fontSize;
    }, textScale);
    await page.getByRole('button', { name: 'Start training' }).click();
    await expect(
      page.getByRole('heading', { name: 'Type roundup' }),
    ).toBeVisible();
    await page.evaluate(async () => {
      await Promise.allSettled(
        document.getAnimations().map((animation) => animation.finished),
      );
    });

    const typeRows = page.locator('.answer__types');
    await expect(typeRows).toHaveCount(4);
    for (const typeRow of await typeRows.all()) {
      await expect(typeRow).toBeHidden();
    }

    const getGeometry = () =>
      page.evaluate(() => {
        const box = (selector: string) => {
          const rect = document
            .querySelector(selector)!
            .getBoundingClientRect();
          return { height: rect.height, top: rect.top + window.scrollY };
        };
        return {
          answers: [...document.querySelectorAll('.answer')].map((element) => {
            const rect = element.getBoundingClientRect();
            return { height: rect.height, top: rect.top + window.scrollY };
          }),
          footer: box('.site-footer'),
          question: box('.question'),
        };
      });

    const before = await getGeometry();
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

    const after = await getGeometry();
    expect(
      Math.abs(after.question.height - before.question.height),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(after.footer.top - before.footer.top)).toBeLessThanOrEqual(
      1,
    );
    expect(after.answers).toHaveLength(before.answers.length);
    after.answers.forEach((answer, index) => {
      const beforeAnswer = before.answers[index];
      if (!beforeAnswer)
        throw new Error(`Missing answer geometry at ${index}.`);
      expect(Math.abs(answer.height - beforeAnswer.height)).toBeLessThanOrEqual(
        1,
      );
      expect(Math.abs(answer.top - beforeAnswer.top)).toBeLessThanOrEqual(1);
    });
  });
}

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

test('answers questions with the number keys', async ({ page }) => {
  await seedBrowserRandom(page, 'visual-identity-2');
  await page.goto('/');
  await page.getByRole('button', { name: 'Start training' }).click();

  const image = page.getByRole('img', { name: /Pokémon/ });
  const src = await image.getAttribute('src');
  const pokemon = findPokemonForSprite(src);
  const answer = page.getByRole('button', {
    name: formatName(pokemon!),
    exact: true,
  });
  const shortcut = await answer.getAttribute('aria-keyshortcuts');
  expect(shortcut).toMatch(/^[1-4]$/);
  await page.keyboard.press(shortcut!);

  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('002 / 010');
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
  await completePokedexRound(page);

  await expect(
    page.getByRole('heading', { name: 'Training complete' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Train again' }).click();

  await expect(
    page.getByRole('heading', { name: 'Pokédex scan' }),
  ).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 010');
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

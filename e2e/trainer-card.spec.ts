import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test, catalogData } from './fixtures';
import { emptyPlayerData } from '../src/game/player-data';

const downloadTrainerImage = async (page: Page) => {
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const download = await downloadReady;
  return { download, png: await readFile(await download.path()) };
};

test('customizes and shares the Trainer Card collections', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.results.v2',
      JSON.stringify({
        daily: {},
        progress: {
          championAnswersWithoutClues: 0,
          correctCategories: { type: 10 },
          correctGenerations: {},
          correctPokemon: [],
          correctQuestionTypes: {},
          masteryRounds: 0,
          quickAttackCompleted: false,
          version: 2,
        },
        streak: { creditedDates: [], version: 1 },
        training: {},
      }),
    );
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Trainer profile' }).click();
  await expect(page).toHaveURL(/\?trainer=card$/);
  await expect(
    page.getByRole('article', { name: 'Trainer Card' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Titles', exact: true }).click();
  const initialTitles = page.getByRole('article', {
    name: 'Trainer Titles collection',
  });
  await initialTitles
    .getByRole('button', { name: /Type Specialist.*Earned/ })
    .click();
  await page.getByRole('button', { name: 'Equip title' }).click();
  await page.getByRole('button', { name: 'Card', exact: true }).click();

  await page.getByRole('button', { name: 'Edit card' }).click();
  await expect(page.getByLabel('Trainer title')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Trainer name' }).fill('Leaf');
  await page.getByRole('combobox', { name: 'Partner Pokémon' }).fill('Pikachu');
  await page.getByRole('option', { name: 'Pikachu', exact: true }).click();
  await page.getByRole('button', { name: 'Save card' }).click();

  const card = page.getByRole('article', { name: 'Trainer Card' });
  await expect(card.getByText('Play at')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await expect(card.locator('.trainer-card__partner-caption')).toHaveText(
    'No. 0025Pikachu',
  );
  await expect(
    page.getByText('Type Specialist', { exact: true }),
  ).toBeVisible();
  await expect(card.locator('.trainer-card__title > svg')).toBeVisible();
  await expect(
    card.locator('.trainer-card__title .trainer-title-mark__tier'),
  ).toHaveCount(0);

  const { png } = await downloadTrainerImage(page);
  expect(png.subarray(1, 4).toString()).toBe('PNG');

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: ({ files }: ShareData) => Boolean(files?.length),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        Object.assign(window, {
          sharedTrainerArtifact: {
            hasUrl: 'url' in data,
            text: data.text,
          },
        });
        return Promise.resolve();
      },
    });
  });
  await page.reload();

  const sharedArtifact = () =>
    page.evaluate(
      () =>
        (
          window as typeof window & {
            sharedTrainerArtifact?: { hasUrl: boolean; text?: string };
          }
        ).sharedTrainerArtifact,
    );

  await page.getByRole('button', { name: 'Share card' }).click();
  await expect.poll(sharedArtifact).toEqual({
    hasUrl: false,
    text: 'My Quizmon Trainer Card\nhttps://quizmon.raveh.dev/',
  });

  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(page).toHaveURL(/\?trainer=badges$/);
  const badgeCase = page.getByRole('article', {
    name: 'League Badge Case',
  });
  await expect(badgeCase).toBeVisible();
  await expect(badgeCase.getByText('Play at')).toHaveCount(0);
  await page.getByRole('button', { name: 'Share case' }).click();
  await expect.poll(sharedArtifact).toEqual({
    hasUrl: false,
    text: 'My Quizmon League Badge Case\nhttps://quizmon.raveh.dev/',
  });

  await expect(badgeCase.getByText(/^0 \/ \d+$/)).toHaveCount(0);
  await badgeCase.getByRole('button', { name: /Many Paths\. Locked/ }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Many Paths' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog').getByText('0 / 10')).toBeVisible();
  await page.getByRole('button', { name: 'Close badge details' }).click();

  await page.getByRole('button', { name: 'Titles', exact: true }).click();
  await expect(page).toHaveURL(/\?trainer=titles$/);
  const titles = page.getByRole('article', {
    name: 'Trainer Titles collection',
  });
  await expect(titles).toBeVisible();
  await expect(titles.getByText('Play at')).toHaveCount(0);
  await expect(titles.getByText('Trainer Titles')).toHaveCount(0);
  await expect(titles.getByText(/lifetime/i)).toHaveCount(0);
  await expect(titles.getByText(/^\d+ \/ \d+ earned$/)).toHaveCount(0);
  const equippedTitle = titles.getByRole('button', {
    name: /Type Specialist.*Equipped/,
  });
  await expect(equippedTitle).toBeVisible();
  await equippedTitle.click();
  await expect(
    page.getByRole('button', { name: 'Unequip title' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close title details' }).click();
  await titles.getByRole('button', { name: /Ability Specialist/ }).click();
  const titleDialog = page.getByRole('dialog');
  await expect(
    titleDialog.getByRole('heading', { name: 'Ability Specialist' }),
  ).toBeVisible();
  await expect(
    titleDialog.getByText('Know which abilities a Pokémon can have.'),
  ).toBeVisible();
  await expect(
    titleDialog.getByText('Answer 10 questions correctly in this field.'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Close title details' }).click();
  await page.getByRole('button', { name: 'Share titles' }).click();
  await expect.poll(sharedArtifact).toEqual({
    hasUrl: false,
    text: 'My Quizmon Trainer Titles\nhttps://quizmon.raveh.dev/',
  });

  await equippedTitle.click();
  await page.getByRole('button', { name: 'Unequip title' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Trainer title unequipped.')).toBeVisible();
  await page.reload();
  await expect(titles).toBeVisible();
  await expect(equippedTitle).toHaveCount(0);
  await expect(
    titles.getByRole('button', { name: /Type Specialist.*Earned/ }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Card', exact: true }).click();
  await expect(page).toHaveURL(/\?trainer=card$/);
  await expect(card.locator('.trainer-card__title')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL('/');
});

for (const { width, partner } of [320, 390, 1280].flatMap((width) =>
  ['garchomp', 'typhlosion-hisui', 'urshifu-single-strike-gmax'].map(
    (partner) => ({ width, partner }),
  ),
)) {
  test(`shows saved Trainer records with ${partner} at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date('2026-09-07T12:00:00'));
    const data = emptyPlayerData();
    data.generationPromptAnswered = true;
    data.profile = {
      version: 1,
      createdAt: '2026-09-01',
      hasBeenRevealed: true,
      name: 'Alexandria Evergreen',
      partnerPokemon: partner,
      specialty: 'type',
    };
    data.pokedex = [
      'bulbasaur',
      'ivysaur',
      'venusaur',
      'bulbasaur',
      'unknown-pokemon',
    ];
    data.results.progress.correctPokemon = ['pikachu'];
    data.results.progress.correctCategories = { type: 12000, matchup: 684 };
    const dates = [
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-09-06',
      '2026-09-07',
    ];
    for (const date of dates) {
      data.results.daily[date] = {
        answers: [],
        contentVersion: 1,
        correctCount: 3,
        elapsedSeconds: 60,
        questionCount: 5,
        score: 3000,
      };
    }
    data.results.streak.creditedDates = dates;
    await page.addInitScript(
      (save) => localStorage.setItem('quizmon.player', JSON.stringify(save)),
      { version: 2, restoreId: null, data },
    );
    await page.goto('/?trainer=card');
    const card = page.getByRole('article', { name: 'Trainer Card' });
    await expect(card.locator('.trainer-card__record')).toHaveText(
      `Pokémon found3 / ${Object.keys(catalogData.pokemon).length}`,
    );
    await expect(
      card.getByRole('img', { name: '2-day Daily Combo' }),
    ).toBeVisible();
    for (const label of ['Name', 'Correct answers', 'Daily clears']) {
      await expect(card.getByText(label, { exact: true })).toHaveCount(0);
    }
    await expect(
      card.getByRole('heading', { name: data.profile.name }),
    ).toBeVisible();
    await expect(
      card.getByRole('list', { name: 'League Badges' }).getByRole('listitem'),
    ).toHaveCount(0);
    expect(
      await card.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    const overflowing = await card
      .locator('.trainer-card__record')
      .evaluate((element) =>
        [...element.querySelectorAll<HTMLElement>('*')].some(
          (child) => child.scrollWidth > child.clientWidth + 1,
        ),
      );
    expect(overflowing).toBe(false);
    const clipped = await card.evaluate((element) => {
      const frame = element.getBoundingClientRect();
      const footer = element
        .querySelector('.trainer-card__details')!
        .getBoundingClientRect();
      return Array.from(
        element.querySelectorAll<HTMLElement>(
          '.trainer-card__rank, .trainer-card__identity, .trainer-card__partner-caption, .trainer-card__details, .trainer-card__record, .trainer-card__combo',
        ),
      )
        .filter((child) => {
          const bounds = child.getBoundingClientRect();
          const bottom = child.closest('.trainer-card__front')
            ? footer.top
            : frame.bottom - 3;
          return (
            bounds.left < frame.left ||
            bounds.right > frame.right ||
            bounds.top < frame.top ||
            bounds.bottom > bottom + 1
          );
        })
        .map((child) => child.className);
    });
    expect(clipped).toEqual([]);
    const cardBounds = await card.boundingBox();
    const exportDimensions = async () => {
      const { png } = await downloadTrainerImage(page);
      return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
    };
    const cardExport = await exportDimensions();
    await page.getByRole('button', { name: 'Badges', exact: true }).click();
    const badgeCase = page.getByRole('article', { name: 'League Badge Case' });
    const caseBounds = await badgeCase.boundingBox();
    expect(caseBounds?.width).toBe(cardBounds?.width);
    expect(caseBounds?.height).toBe(cardBounds?.height);
    expect(await exportDimensions()).toEqual(cardExport);
    for (const badge of await badgeCase.locator('.trainer-badge').all()) {
      const bounds = (await badge.boundingBox())!;
      expect(Math.abs(bounds.width - bounds.height)).toBeLessThan(1);
      expect(bounds.y).toBeGreaterThanOrEqual(caseBounds!.y);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(
        caseBounds!.y + caseBounds!.height,
      );
    }
    await page.getByRole('button', { name: 'Pokédex', exact: true }).click();
    await expect(page.locator('.trainer-pokedex__summary')).toHaveText(
      `3 / ${Object.keys(catalogData.pokemon).length} found`,
    );
  });
}

test('plays and exports the polished Champion finish with reduced motion support', async ({
  page,
}, testInfo) => {
  const data = emptyPlayerData();
  data.generationPromptAnswered = true;
  data.profile = {
    version: 1,
    createdAt: '2026-09-01',
    hasBeenRevealed: true,
    name: 'Leaf',
    partnerPokemon: 'garchomp',
    specialty: null,
  };
  data.results.league.completed = true;
  await page.addInitScript(
    (save) => localStorage.setItem('quizmon.player', JSON.stringify(save)),
    { version: 2, restoreId: null, data },
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?trainer=card');
  const card = page.getByRole('article', { name: 'Trainer Card' });
  const effects = card.locator('.trainer-card__finish-effects');
  const polish = effects.locator('.trainer-card__polish');
  const reflectionPosition = () =>
    polish.evaluate(
      (element) => getComputedStyle(element, '::before').transform,
    );
  await expect(effects).toHaveClass(/is-motion-active/);
  const initialPosition = await reflectionPosition();
  await expect.poll(reflectionPosition).not.toBe(initialPosition);

  const { download, png } = await downloadTrainerImage(page);
  await download.saveAs(testInfo.outputPath('champion-card.png'));
  await expect(effects).toHaveClass(/is-motion-active/);

  await polish.evaluate((element) => {
    element.style.visibility = 'hidden';
  });
  const { png: withoutReflection } = await downloadTrainerImage(page);
  await polish.evaluate((element) => {
    element.style.removeProperty('visibility');
  });
  const highlightedPixels = await page.evaluate(
    async ([finished, plain]) => {
      const pixels = async (base64: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return context.getImageData(
          Math.round(image.width * 0.4),
          Math.round(image.height * 0.55),
          Math.round(image.width * 0.4),
          Math.round(image.height * 0.15),
        ).data;
      };
      const [a, b] = await Promise.all([pixels(finished!), pixels(plain!)]);
      let highlights = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i + 1]! - b[i + 1]! > 8 || a[i + 2]! - b[i + 2]! > 8)
          highlights++;
      }
      return highlights;
    },
    [png.toString('base64'), withoutReflection.toString('base64')],
  );
  expect(highlightedPixels).toBeGreaterThan(200);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(effects).toHaveClass(/is-static/);
  await expect(effects).not.toHaveClass(/is-motion-active/);
  expect(
    await polish.evaluate(
      (element) => getComputedStyle(element, '::before').animationName,
    ),
  ).toBe('none');
});

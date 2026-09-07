import { readFile } from 'node:fs/promises';
import { expect, test, catalogData } from './fixtures';
import { emptyPlayerData } from '../src/game/player-data';

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
  await page.getByRole('option', { name: 'Pikachu' }).click();
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
  await expect(
    card.locator('.trainer-card__title .trainer-title-mark'),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const downloadPath = await (await downloadPromise).path();
  const png = await readFile(downloadPath);
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

  await page.getByRole('button', { name: 'Share card' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              sharedTrainerArtifact?: { hasUrl: boolean; text?: string };
            }
          ).sharedTrainerArtifact,
      ),
    )
    .toEqual({
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
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              sharedTrainerArtifact?: { hasUrl: boolean; text?: string };
            }
          ).sharedTrainerArtifact,
      ),
    )
    .toEqual({
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
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              sharedTrainerArtifact?: { hasUrl: boolean; text?: string };
            }
          ).sharedTrainerArtifact,
      ),
    )
    .toEqual({
      hasUrl: false,
      text: 'My Quizmon Trainer Titles\nhttps://quizmon.raveh.dev/',
    });

  await page.reload();
  await expect(titles).toBeVisible();

  await page.getByRole('button', { name: 'Card', exact: true }).click();
  await expect(page).toHaveURL(/\?trainer=card$/);
  await expect(page.getByRole('heading', { name: 'Leaf' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL('/');
});

for (const width of [320, 390, 1280]) {
  test(`shows saved Trainer records at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date('2026-09-07T12:00:00'));
    const data = emptyPlayerData();
    data.generationPromptAnswered = true;
    data.profile = {
      version: 1,
      createdAt: '2026-09-01',
      hasBeenRevealed: true,
      name: 'Alexandria Evergreen',
      partnerPokemon: 'garchomp',
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
    for (const [label, value] of [
      ['Pokédex found', `3 / ${Object.keys(catalogData.pokemon).length}`],
      ['Correct answers', '12,684'],
      ['Daily clears', '6'],
      ['Day combo', '2 · Best 4'],
    ] as const) {
      await expect(
        card
          .locator('dl > div')
          .filter({ has: page.getByText(label, { exact: true }) }),
      ).toHaveText(`${label}${value}`);
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
    await page.getByRole('button', { name: 'Pokédex', exact: true }).click();
    await expect(page.locator('.trainer-pokedex__summary')).toHaveText(
      `3 / ${Object.keys(catalogData.pokemon).length} found`,
    );
  });
}

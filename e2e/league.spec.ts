import AxeBuilder from '@axe-core/playwright';
import type { PlayerSave } from '../src/domain/player/player-save';
import { getLeagueSettings } from '../src/domain/quiz/league';
import { buildLeagueQuestions } from '../src/domain/quiz/question-generation';
import { getQuestionTitle } from '../src/domain/quiz/question-labels';
import type { ActiveGameSnapshot } from '../src/lib/storage/active-game-storage';
import { catalog, expect, test } from './fixtures';

const leagueSeed = 'league-e2e-lineup';

const unlockLeague = (completed = false) => {
  const savedDailyResult = {
    answers: [],
    contentVersion: 1,
    correctCount: 0,
    elapsedSeconds: 0,
    questionCount: 1,
    score: 0,
    scoreVersion: 2,
  };
  const dates = Array.from(
    { length: 7 },
    (_, index) => `2026-08-${String(25 + index).padStart(2, '0')}`,
  );
  window.localStorage.setItem(
    'quizmon.results.v2',
    JSON.stringify({
      daily: Object.fromEntries(dates.map((date) => [date, savedDailyResult])),
      league: {
        completed,
        seed: completed ? null : 'league-e2e-lineup',
      },
      progress: {
        championAnswersWithoutClues: 5,
        correctCategories: { identity: 50 },
        correctGenerations: Object.fromEntries(
          ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'].map(
            (generation) => [generation, 1],
          ),
        ),
        correctPokemon: Array.from(
          { length: 151 },
          (_, index) => `pokemon-${index}`,
        ),
        correctQuestionTypes: Object.fromEntries(
          [
            'ability-check',
            'counter-pick',
            'evolution-shift',
            'field-notes',
            'move-check',
            'odd-one-out',
            'pixel-peek',
            'pokedex-scan',
            'shiny-spotter',
            'silhouette-match',
          ].map((questionType) => [questionType, 1]),
        ),
        masteryRounds: 3,
        quickAttackCompleted: true,
        version: 2,
      },
      streak: { creditedDates: dates, version: 1 },
      training: {},
    }),
  );
};

test('refreshes League attempts and retries while preserving reloads', async ({
  page,
}) => {
  await page.addInitScript(unlockLeague, false);
  await page.goto('/');

  const leagueButton = page.getByRole('button', { name: 'Quizmon League' });
  await expect(leagueButton).toBeVisible();
  await leagueButton.click();
  await expect(
    page.getByRole('heading', { name: 'League challenge', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'League views' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Start League challenge' }).click();

  const readAttempt = async () => {
    await expect(
      page.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toBeVisible();
    return page.evaluate(
      () =>
        JSON.parse(
          sessionStorage.getItem('quizmon.active-game.v1')!,
        ) as ActiveGameSnapshot,
    );
  };
  const original = await readAttempt();
  expect(original.seed).not.toBe(leagueSeed);
  const first = original.questions[0]!;
  await expect(
    page.getByRole('heading', { name: getQuestionTitle(first) }),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: /Elite Trial I, Recognition/ }),
  ).toBeVisible();

  const wrongOption = first.options.find(
    (option) => !first.answer.correctOptions.includes(option),
  )!;
  await page.locator('.answer').nth(first.options.indexOf(wrongOption)).click();

  await expect(
    page.getByRole('heading', { name: 'League challenge ended' }),
  ).toBeVisible();
  await expect(
    page.locator('.result-details .league-progress [aria-current="step"]'),
  ).toContainText('I');
  await page.getByRole('button', { name: 'Retry League' }).click();
  const retry = await readAttempt();
  expect(retry.seed).not.toBe(original.seed);
  expect(retry.questions).not.toEqual(original.questions);

  await page.reload();
  const restored = await readAttempt();
  expect(restored.seed).toBe(retry.seed);
  expect(restored.questions).toEqual(retry.questions);
  expect(restored.answers).toEqual(retry.answers);
  await page.getByRole('button', { name: 'Leave game' }).click();

  await page.getByRole('button', { name: 'Trainer profile' }).click();
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Start League challenge' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await leagueButton.click();
  await page.getByRole('button', { name: 'Start League challenge' }).click();
  const restarted = await readAttempt();
  expect(restarted.seed).not.toBe(retry.seed);
  expect(restarted.questions).not.toEqual(retry.questions);
});

test('keeps Hall of Fame deep links on the challenge before a League clear', async ({
  page,
}) => {
  await page.addInitScript(unlockLeague, false);
  await page.goto('/?league=hall');
  await expect(
    page.getByRole('heading', { name: 'League challenge', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Hall of Fame', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'League challenge', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(
    page.getByRole('button', { name: 'Quizmon League', exact: true }),
  ).not.toContainText('Hall of Fame');
});

test('shows Champion and Hall of Fame after clearing the League', async ({
  page,
}) => {
  await page.addInitScript(unlockLeague, true);
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Quizmon League', exact: true })
    .click();
  await expect(page).toHaveURL(/league=hall/);
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame' }),
  ).toBeVisible();
  await expect(page.getByText('Your Champion title is yours.')).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Challenge Pokémon' }),
  ).toHaveCount(0);
  await expect(page.locator('.league-trophy__image')).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include('.league-hall').analyze())
      .violations,
  ).toEqual([]);
  await expect(page.getByRole('button', { name: /settings/i })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(
    page.getByRole('button', { name: 'Quizmon League', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Trainer profile' }).click();
  await expect(page.getByText('Champion', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hall of Fame' })).toHaveCount(
    0,
  );
});

test('a perfect clear opens the induction before its detailed results', async ({
  page,
}) => {
  const settings = getLeagueSettings({
    answerFlow: 'manual',
    reduceMotion: true,
    soundVolume: 0,
    timerDisplay: 'seconds',
  });
  const questions = buildLeagueQuestions(catalog, leagueSeed, settings);
  const snapshot = {
    version: 2,
    questions,
    contentVersion: catalog.contentVersion,
    elapsedMilliseconds: 15000,
    mode: { kind: 'league' },
    settings,
    questionCount: 15,
    seed: leagueSeed,
    answers: questions.map((question) => ({
      category: question.category,
      cluesUsed: 0,
      correct: true,
      generation: question.generation,
      pokemonName: question.pokemonName,
      points: 1000,
      questionType: question.questionType,
      responseMilliseconds: 1000,
    })),
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(unlockLeague, false);
  await page.addInitScript(
    (value) =>
      sessionStorage.setItem('quizmon.active-game.v1', JSON.stringify(value)),
    snapshot,
  );
  const { promise: spritesReady, resolve: releaseSprites } =
    Promise.withResolvers<void>();
  await page.route('**/sprites/pokemon/**', async (route) => {
    await spritesReady;
    await route.fallback();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame', exact: true }),
  ).toBeVisible();
  const lineup = page.locator('.hall-record__group');
  await expect(lineup).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const portrait = page.locator('.hall-record__portrait');
  const frame = await portrait.boundingBox();
  const positions = await lineup
    .locator('li')
    .evaluateAll((items) => items.map((item) => item.getAttribute('style')));
  expect(
    await lineup
      .locator('img')
      .evaluateAll((images) =>
        images.every(
          (image) => image instanceof HTMLImageElement && !image.complete,
        ),
      ),
  ).toBe(true);
  releaseSprites();
  await expect
    .poll(() =>
      lineup
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(
    await lineup
      .locator('li')
      .evaluateAll((items) => items.map((item) => item.getAttribute('style'))),
  ).toEqual(positions);
  expect(await portrait.boundingBox()).toEqual(frame);
  await expect(lineup.locator('li')).not.toHaveCount(1);
  const saved = await page.evaluate(
    () =>
      (JSON.parse(localStorage.getItem('quizmon.player')!) as PlayerSave).data
        .hallOfFame,
  );
  expect(saved).toHaveLength(1);
  expect(saved[0]?.result.score).toBe(30000);
  expect(saved[0]?.pokemon).toContain(questions[0]!.pokemonName);
  await expect(page.locator('.league-trophy__rays')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(page.getByRole('button', { name: /settings/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'View results' }).click();
  await expect(
    page.getByRole('heading', { name: 'League Champion', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /Hall of Fame.*Open Hall of Fame/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await page.getByRole('button', { name: 'League rematch' }).click();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 015');
});

for (const width of [320, 390, 1280]) {
  for (const completed of [false, true]) {
    test(`keeps the landing trophy inside its League action at ${width}px (${completed ? 'champion' : 'challenger'})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(unlockLeague, completed);
      await page.goto('/');
      const action = page.getByRole('button', {
        name: 'Quizmon League',
        exact: true,
      });
      await expect(action).toBeVisible();
      const bounds = await action.evaluate((button) => {
        const image = button
          .querySelector('.league-trophy__image')!
          .getBoundingClientRect();
        const trophy = button
          .querySelector('.league-trophy')!
          .getBoundingClientRect();
        const copy = button
          .querySelector('.landing__league-copy')!
          .getBoundingClientRect();
        return {
          left: image.left - trophy.left,
          top: image.top - trophy.top,
          right: trophy.right - image.right,
          bottom: trophy.bottom - image.bottom,
          textGap: copy.left - image.right,
        };
      });
      for (const value of Object.values(bounds))
        expect(value).toBeGreaterThanOrEqual(0);
    });
  }
}

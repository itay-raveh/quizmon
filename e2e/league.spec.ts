import { questionTypes } from '../src/domain/quiz/questions/definitions';
import { observeAnswer } from '../src/domain/quiz/answer-observation';
import { seedPlayer } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import type { PlayerSave } from '../src/domain/player/player-save';
import { getLeagueSettings } from '../src/domain/quiz/league';
import { buildLeagueQuestions } from '../src/domain/quiz/question-generation';
import { getQuestionTitle } from '../src/domain/quiz/question-labels';
import {
  calculateScore,
  getSpeedBonusPoints,
} from '../src/domain/quiz/scoring';
import type { ActiveGameSnapshot } from '../src/lib/storage/active-game-storage';
import { readRound, readSave } from './database-fixture';
import { catalog, expect, test } from './fixtures';

const leagueSeed = 'league-e2e-lineup';
const unlockLeague = (
  page: Parameters<typeof seedPlayer>[0],
  completed = false,
) => {
  const savedDailyResult = {
    answers: [],
    contentVersion: 1,
    correctCount: 0,
    elapsedSeconds: 0,
    questionCount: 1,
    score: 0,
    scoreVersion: 1,
  };
  const dates = Array.from(
    { length: 7 },
    (_, index) => `2026-08-${String(25 + index).padStart(2, '0')}`,
  );
  return seedPlayer(page, {
    results: {
      daily: Object.fromEntries(dates.map((date) => [date, savedDailyResult])),
      league: {
        completed,
        seed: completed ? null : 'league-e2e-lineup',
      },
      progress: {
        quickAttackRounds: 1,
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
        correctQuestionTypes: {
          ...Object.fromEntries(
            questionTypes
              .slice(0, Math.ceil(questionTypes.length / 2))
              .map((type) => [type, 1]),
          ),
          'pokedex-scan': 50,
        },
        masteryRounds: 3,
        quickAttackCompleted: true,
      },
      streak: { creditedDates: dates },
      training: {},
    },
  });
};
test('refreshes League attempts and retries while preserving reloads', async ({
  page,
}) => {
  await unlockLeague(page, false);
  await page.goto('/');
  const leagueButton = page.getByRole('button', { name: 'Quizmon League' });
  await expect(leagueButton).toBeVisible({ timeout: 15_000 });
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
    return readRound(page).then(
      (saved) =>
        JSON.parse(
          (saved ? JSON.stringify(saved) : null)!,
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
  await page
    .getByRole('navigation', { name: 'Main', exact: true })
    .getByRole('button', { name: 'Trainer', exact: true })
    .click();
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Start League challenge' }),
  ).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Main', exact: true })
    .getByRole('button', { name: 'Play', exact: true })
    .click();
  await leagueButton.click();
  await page.getByRole('button', { name: 'Start League challenge' }).click();
  const restarted = await readAttempt();
  expect(restarted.seed).not.toBe(retry.seed);
  expect(restarted.questions).not.toEqual(retry.questions);
});
test('keeps Hall of Fame deep links on the challenge before a League clear', async ({
  page,
}) => {
  await unlockLeague(page, false);
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
  await unlockLeague(page, true);
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
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(
    page.getByRole('button', { name: 'Quizmon League', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main', exact: true })
    .getByRole('button', { name: 'Trainer', exact: true })
    .click();
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
    version: 1,
    questions,
    contentVersion: catalog.contentVersion,
    elapsedMilliseconds: 15000,
    mode: { kind: 'league' },
    settings,
    questionCount: 15,
    seed: leagueSeed,
    answers: questions.map((question) => ({
      observation: observeAnswer(question, question.answer.correctOptions),
      category: question.category,
      subject: {
        kind: question.subject.kind,
        name: question.subject.name,
        generation: question.subject.generation,
      },
      ...(question.category === 'champion' ? { unassistedSearch: true } : {}),
      cluesUsed: 0,
      correct: true,
      points: 1000,
      questionType: question.questionType,
      responseMilliseconds: 1000,
      speedBonus: getSpeedBonusPoints(1000, 1000),
    })),
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await unlockLeague(page, false);
  await page.addInitScript(
    (value) =>
      sessionStorage.setItem(
        'quizmon.baseline.fixture-round',
        JSON.stringify(value),
      ),
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
  const saved = await readSave(page).then(
    (saved) =>
      (JSON.parse((saved ? JSON.stringify(saved) : null)!) as PlayerSave).data
        .hallOfFame,
  );
  expect(saved).toHaveLength(1);
  expect(saved[0]?.result.score).toBe(calculateScore(snapshot.answers));
  expect(saved[0]?.pokemon).toContain(questions[0]!.subject.name);
  await expect(page.locator('.league-trophy__rays')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'View results' }).click();
  await expect(
    page.getByRole('heading', { name: 'League Champion', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Trainer progress' })
      .getByText('Hall of Fame', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main', exact: true })
    .getByRole('button', { name: 'Play', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Quizmon League', exact: true })
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

import { buildLeagueQuestions, getLeagueModifiers } from '../src/game/league';
import { getQuestionTitle } from '../src/game/game';
import type { PokemonCatalog } from '../src/game/types';
import { catalogData, expect, test } from './fixtures';

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

test('opens the unlocked League from home and keeps its retry lineup', async ({
  page,
}) => {
  await page.addInitScript(unlockLeague, false);
  await page.goto('/');

  const leagueButton = page.getByRole('button', { name: 'Quizmon League' });
  await expect(leagueButton).toBeVisible();
  await leagueButton.click();
  await expect(
    page.getByRole('heading', { name: 'Quizmon League', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start League challenge' }).click();

  const questions = buildLeagueQuestions(
    catalogData as PokemonCatalog,
    leagueSeed,
    {
      answerFlow: 'manual',
      reduceMotion: false,
      soundVolume: 0,
      timerDisplay: 'seconds',
    },
  );
  const first = questions[0]!;
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
  await expect(page.getByText('Elite Trial I')).toBeVisible();
  await page.getByRole('button', { name: 'Retry League' }).click();
  await expect(
    page.getByRole('heading', { name: getQuestionTitle(first) }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole('heading', { name: getQuestionTitle(first) }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Leave game' }).click();

  await page.getByRole('button', { name: 'Trainer profile' }).click();
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Start League challenge' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await leagueButton.click();
  await page.getByRole('button', { name: 'Start League challenge' }).click();
  await expect(
    page.getByRole('heading', { name: getQuestionTitle(first) }),
  ).toBeVisible();
});

test('shows Champion and Hall of Fame after clearing the League', async ({
  page,
}) => {
  await page.addInitScript(unlockLeague, true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Hall of Fame', exact: true }).click();
  await expect(page).toHaveURL(/league=hall/);
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame' }),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Five completed League trials' }),
  ).toBeVisible();
  await expect(page.getByText('15 / 15', { exact: true })).toBeVisible();
  await expect(page.locator('.league-hall__backdrop')).toBeVisible();
  await expect(page.getByRole('button', { name: /settings/i })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(
    page.getByRole('button', { name: 'Hall of Fame', exact: true }),
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
  const modifiers = getLeagueModifiers({
    answerFlow: 'manual',
    reduceMotion: true,
    soundVolume: 0,
    timerDisplay: 'seconds',
  });
  const questions = buildLeagueQuestions(
    catalogData as PokemonCatalog,
    leagueSeed,
    modifiers,
  );
  const snapshot = {
    version: 1,
    contentVersion: catalogData.contentVersion,
    elapsedMilliseconds: 15000,
    mode: { kind: 'league' },
    modifiers,
    questionCount: 15,
    seed: leagueSeed,
    answers: questions.map((question) => ({
      category: question.category,
      cluesUsed: 0,
      correct: true,
      generation: question.generation,
      pokemonName: 'pikachu',
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
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('15 / 15', { exact: true })).toBeVisible();
  await expect(page.locator('.league-hall__backdrop')).toBeVisible();
  await expect(page.locator('.league-hall__chamber')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(page.getByRole('button', { name: /settings/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'View results' }).click();
  await expect(
    page.getByRole('heading', { name: 'League Champion', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /Trainer progress.*Open Hall of Fame/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'League rematch' }).click();
  await expect(
    page.getByRole('progressbar', { name: 'Quiz progress' }),
  ).toHaveText('001 / 015');
});

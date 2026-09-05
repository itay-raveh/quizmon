import { buildLeagueQuestions } from '../src/game/league';
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

  const questions = buildLeagueQuestions(
    catalogData as PokemonCatalog,
    leagueSeed,
    { soundEnabled: false, speedrunMode: false },
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

  await page.getByRole('button', { name: 'Trainer Card' }).click();
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Start League challenge' }),
  ).toBeVisible();
  await expect(page.getByText('15 correct answers required')).toBeVisible();
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
  await page.getByRole('button', { name: 'Trainer Card' }).click();

  await expect(page.getByText('Champion')).toBeVisible();
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hall of Fame' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'League rematch' }),
  ).toBeVisible();
});

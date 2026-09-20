import { observeAnswer } from '../src/domain/quiz/answer-observation';
import { readSave, readRound } from './database-fixture';
import { catalog } from './fixtures';
import { generations } from '../src/domain/pokemon/types';
import { questionTypes } from '../src/domain/quiz/questions/definitions';
import {
  getQuestionTypeMultiplier,
  getTrainingScoreMultipliers,
} from '../src/domain/quiz/score-multipliers';
import { calculateScore } from '../src/domain/quiz/scoring';
import {
  buildQuestions,
  resolveTrainingSettings,
} from '../src/domain/quiz/question-generation';
import { defaultGameSettings } from '../src/domain/settings/game-settings';
import { createSeededRandom } from '../src/lib/random';
import { seedPlayer } from './fixtures';
import { expect, expectNoHorizontalOverflow, test } from './fixtures';

for (const width of [360, 1280]) {
  test(`Training previews and preserves its multiplier at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({
      reducedMotion: width === 360 ? 'reduce' : 'no-preference',
    });
    await seedPlayer(page, {
      settings: {
        difficulty: 3,
        questionSelection: 'custom',
        questionTypes: ['sprite-match', 'field-notes', 'stat-showdown'],
        generations: ['I', 'II'],
        formGroups: ['standard'],
        answerFlow: 'manual',
        soundVolume: 0,
      },
    });
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Customize training', exact: true })
      .click();
    const preview = page.locator('.training-multiplier');
    await expect(preview).toContainText('Training multiplier');
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('settings.png'),
    });
    const multiplierLabel = await preview.locator('strong').textContent();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page
      .getByRole('button', { name: 'Start training', exact: true })
      .click();
    await expect(page.locator('.question')).toBeVisible();
    const initial = (await readRound(page))!;
    expect(initial.scoreMultipliers).toMatchObject({
      difficulty: 3,
      generations: 2,
    });
    expect(initial.scoreMultipliers!.questionTypes).toHaveLength(3);
    const multiplier =
      initial.scoreMultipliers!.difficulty *
      initial.scoreMultipliers!.generations *
      initial.scoreMultipliers!.questionTypes.reduce(
        (total, entry) => total * entry.multiplier,
        1,
      );
    expect(multiplierLabel).toBe(
      `×${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 }).format(multiplier)}`,
    );

    for (let index = 0; index < 10; index++) {
      const round = (await readRound(page))!;
      const question = round.questions[round.answers.length]!;
      const answerIndices = question.answer.correctOptions.map((value) =>
        question.options.indexOf(value),
      );
      for (const answerIndex of answerIndices)
        await page.locator('.answer').nth(answerIndex).click();
      const submit = page.getByRole('button', {
        name: 'Check answers',
        exact: true,
      });
      if (await submit.isVisible()) await submit.click();
      await page
        .getByRole('button', {
          name: index === 9 ? 'See results' : 'Next question',
          exact: true,
        })
        .click();
      if (index === 0) {
        await page.reload();
        await expect(page.getByRole('progressbar')).toHaveText('002 / 010');
        const resumed = (await readRound(page))!;
        expect(resumed.scoreMultipliers).toEqual(initial.scoreMultipliers);
      }
    }

    await expect(
      page.getByRole('heading', { name: 'Training complete' }),
    ).toBeVisible();
    const saved = (await readSave(page)).data.results.training['score:3']!;
    expect(saved.correctCount).toBe(10);
    expect(saved.scoreMultipliers).toEqual(initial.scoreMultipliers);
    const knowledge = saved.answers.reduce(
      (sum, answer) => sum + answer.points,
      0,
    );
    const speed = saved.answers.reduce(
      (sum, answer) => sum + (answer.speedBonus ?? 0),
      0,
    );
    const mastery = Math.round(
      (knowledge * knowledge) / (saved.answers.length * 1000),
    );
    expect(saved.score).toBe(
      Math.round((knowledge + speed + mastery) * multiplier),
    );
    await expect(page.locator('.score strong')).toHaveText(
      saved.score.toLocaleString('en-US'),
    );
    await expect(
      page.getByRole('list', { name: 'Score multipliers' }),
    ).toBeVisible();
    await expect(
      page.getByText('New Training best!', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/best for this configuration/i)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('results.png'),
      fullPage: true,
    });
  });
}

for (const width of [320, 1280]) {
  test(`a completed hard round keeps its large score at ${width}px`, async ({
    page,
  }) => {
    const settings = {
      ...defaultGameSettings,
      difficulty: 5 as const,
      questionSelection: 'custom' as const,
      generations: [...generations],
      questionTypes: questionTypes.filter(
        (type) => getQuestionTypeMultiplier(type, 5) === 1.25,
      ),
      soundVolume: 0,
      reduceMotion: true,
    };
    const resolved = resolveTrainingSettings(catalog, settings);
    const multipliers = getTrainingScoreMultipliers(resolved)!;
    const questions = buildQuestions(
      catalog,
      resolved,
      createSeededRandom('large-score'),
    );
    const answers = questions.map((question) => ({
      observation: observeAnswer(question, question.answer.correctOptions),
      category: question.category,
      questionType: question.questionType,
      subject: question.subject,
      correct: true,
      cluesUsed: 0,
      points: 1000,
      speedBonus: 3000,
      responseMilliseconds: 0,
    }));
    const score = calculateScore(answers, multipliers);
    expect(score).toBeGreaterThan(1_000_000);
    await page.setViewportSize({ width, height: 800 });
    await seedPlayer(page, { settings });
    await page.addInitScript(
      (snapshot) =>
        sessionStorage.setItem(
          'quizmon.active-game.v1',
          JSON.stringify(snapshot),
        ),
      {
        version: 7,
        playerRestoreId: null,
        mode: { kind: 'training' },
        settings: resolved,
        questions,
        answers,
        scoreMultipliers: multipliers,
        questionCount: questions.length,
        seed: 'large-score',
        contentVersion: catalog.contentVersion,
        elapsedMilliseconds: 1,
      },
    );
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Training complete' }),
    ).toBeVisible();
    await expect(page.locator('.score strong')).toHaveText(
      score.toLocaleString('en-US'),
    );
    await expectNoHorizontalOverflow(page);
    expect(
      await page
        .locator('.score strong')
        .evaluate(
          (element) =>
            element.getBoundingClientRect().height <=
            parseFloat(getComputedStyle(element).lineHeight) + 1,
        ),
    ).toBe(true);
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('large-score.png'),
      fullPage: true,
    });
  });
}

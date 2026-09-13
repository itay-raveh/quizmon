import {
  expect,
  test,
  expectNoHorizontalOverflow,
  formatName,
} from './fixtures';
import type { ActiveGameSnapshot } from '../src/lib/storage/active-game-storage';
import { generations } from '../src/domain/pokemon/types';
import { questionLabels } from '../src/domain/quiz/question-labels';
import type { QuestionType } from '../src/domain/quiz/types';

const cases: { type: QuestionType; level: number; count: number }[] = [
  { type: 'item-identification', level: 3, count: 4 },
  { type: 'medicine-cabinet', level: 4, count: 4 },
  { type: 'evolution-items', level: 4, count: 4 },
  { type: 'evolution-conditions', level: 3, count: 4 },
  { type: 'evolution-conditions', level: 4, count: 4 },
  { type: 'evolution-conditions', level: 5, count: 4 },
  { type: 'weight-comparison', level: 5, count: 4 },
  { type: 'height-comparison', level: 3, count: 4 },
  { type: 'move-types', level: 3, count: 18 },
  { type: 'name-that-region', level: 3, count: 9 },
  { type: 'ability-effects', level: 5, count: 4 },
  { type: 'nature-effects', level: 5, count: 4 },
  { type: 'ev-yields', level: 5, count: 4 },
  { type: 'hidden-abilities', level: 5, count: 4 },
  { type: 'berry-flavors', level: 5, count: 4 },
  { type: 'natural-gift', level: 5, count: 18 },
];
for (const { type, level, count } of cases)
  test(`answers and resumes ${type} level ${level} on a narrow screen`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.addInitScript(
      ({ type, level, generations }) => {
        if (localStorage.getItem('expansion-test-seeded')) return;
        localStorage.setItem('expansion-test-seeded', '1');
        localStorage.setItem(
          'quizmon.training-settings.v2',
          JSON.stringify({
            difficulty: level,
            questionSelection: 'custom',
            questionTypes: [type],
            generations,
            trainingMode: 'custom',
            answerFlow: 'manual',
            soundVolume: 0,
          }),
        );
      },
      { type, level, generations },
    );
    await page.route('**/sprites/items/**', (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
      }),
    );
    await page.goto('/?fresh=1');
    await page
      .getByRole('button', { name: 'Start training', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: questionLabels[type], exact: true }),
    ).toBeVisible();
    const snapshot = await page.evaluate(
      () =>
        JSON.parse(
          sessionStorage.getItem('quizmon.active-game.v1')!,
        ) as ActiveGameSnapshot,
    );
    const question = snapshot.questions[0]!;
    expect(question.answer.interaction).toBe('single-choice');
    const answers = page.locator('.answer');
    await expect(answers).toHaveCount(count);
    if (type === 'item-identification')
      expect(await page.locator('.question-visual').innerText()).not.toContain(
        question.optionLabels![question.subject.name],
      );
    if (type === 'weight-comparison' || type === 'height-comparison') {
      await expect(answers.locator('img')).toHaveCount(count);
      for (const answer of await answers.all()) {
        await expect(answer.locator('.pokemon-identity')).toContainText('No.');
        await expect(answer.locator('.pokemon-identity small')).toBeVisible();
      }
    } else if (type === 'medicine-cabinet' || type === 'evolution-items') {
      await expect(answers.locator('img')).toHaveCount(count);
    } else if (question.namesOnly) {
      await expect(answers.locator('img')).toHaveCount(0);
    }
    if (type === 'evolution-items') {
      await expect(
        page.locator('.question-evolution-endpoints img'),
      ).toHaveCount(2);
      for (const number of await page
        .locator('.question-evolution-endpoints .pokemon-identity__number')
        .all())
        await expect(number).toBeVisible();
    }
    if (type === 'evolution-conditions') {
      await expect(
        page.locator('.question-evolution-endpoints img'),
      ).toHaveCount(2);
      for (const number of await page
        .locator('.question-evolution-endpoints .pokemon-identity__number')
        .all())
        await expect(number).toBeVisible();
      const labels = await answers.allTextContents();
      expect(labels.every((label) => !label.includes(' · '))).toBe(true);
    }
    if (type === 'ev-yields' || type === 'hidden-abilities') {
      await expect(page.locator('.question-visual img')).toHaveCount(1);
      await expect(
        page.locator('.question-visual .pokemon-identity__number'),
      ).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
    if (type === 'move-types' || type === 'natural-gift') {
      const labels = await answers.evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute('aria-label')!),
      );
      expect(labels).toEqual(labels.toSorted());
    }
    const correct = question.answer.correctOptions[0]!;
    const correctButton = page.getByRole('button', {
      name: question.optionLabels?.[correct] ?? formatName(correct),
      exact: true,
    });
    if (
      type === 'evolution-conditions' &&
      question.options.every((option) =>
        /^\d+$/.test(question.optionLabels?.[option] ?? ''),
      )
    ) {
      const labels = await answers.evaluateAll((buttons) =>
        buttons.map((button) => Number(button.getAttribute('aria-label'))),
      );
      expect(labels).toEqual(labels.toSorted((a, b) => a - b));
      await page.keyboard.press(
        String(labels.indexOf(Number(question.optionLabels![correct])) + 1),
      );
      await expect(page.locator('.answer--wrong')).toHaveCount(0);
    } else if (type === 'name-that-region') {
      const regions = [
        'Kanto',
        'Johto',
        'Hoenn',
        'Sinnoh',
        'Unova',
        'Kalos',
        'Alola',
        'Galar',
        'Paldea',
      ];
      const labels = await answers.evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute('aria-label')),
      );
      expect(labels).toEqual(regions);
      await page.keyboard.press(
        String(regions.indexOf(question.optionLabels![correct]!) + 1),
      );
    } else {
      await correctButton.focus();
      await page.keyboard.press('Enter');
    }
    await expect(page.locator('.answer--correct')).toHaveCount(1);
    await expect(page.locator('.answer--wrong')).toHaveCount(0);
    if (question.optionReveals)
      await expect(page.locator('.answer__reveal')).toHaveCount(count);
    if (question.explanation)
      await expect(
        page.getByText(question.explanation, { exact: true }),
      ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: questionLabels[type], exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: 'Quiz progress' }),
    ).toContainText('002 / 010');
    await expect(page.locator('.answer--correct')).toHaveCount(0);
    const resumed = await page.evaluate(
      () =>
        JSON.parse(
          sessionStorage.getItem('quizmon.active-game.v1')!,
        ) as ActiveGameSnapshot,
    );
    expect(resumed.questions).toEqual(snapshot.questions);
    expect(resumed.answers[0]?.subject).toEqual({
      kind: question.subject.kind,
      name: question.subject.name,
      generation: question.subject.generation,
    });
    await expectNoHorizontalOverflow(page);
  });

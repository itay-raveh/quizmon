import { seedPlayer } from './fixtures';
import { readRound, readSave, writeSave } from './database-fixture';
import {
  answerCurrentQuestion,
  chooseDaily,
  expect,
  expectNoHorizontalOverflow,
  test,
} from './fixtures';

const snapshot = async (page: Parameters<typeof chooseDaily>[0]) => {
  const round = await readRound(page);
  expect(round).not.toBeNull();
  return round!;
};

for (const width of [360, 1280]) {
  test(`Daily is fixed at Level 3 and resumes one attempt at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await seedPlayer(page, {
      settings: {
        difficulty: 5,
        generations: ['I'],
        formGroups: ['standard'],
        answerFlow: 'manual',
        soundVolume: 0,
      },
    });
    await page.goto('/?daily=2026-09-12');
    await expect(page.locator('.daily-menu')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Start Daily', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Gen I', exact: true }),
    ).toHaveCount(0);
    await chooseDaily(page);
    await expect(page.locator('.question')).toBeVisible();
    const first = await snapshot(page);
    expect(first.mode).toEqual({
      kind: 'daily',
      date: '2026-09-12',
      track: { difficulty: 3, scope: 'all' },
    });
    await answerCurrentQuestion(page);
    await page
      .getByRole('button', { name: 'Next question', exact: true })
      .click();
    await expect(page.getByRole('progressbar')).toHaveText('002 / 005');
    await page.goto('/?daily=2026-09-12&level=5&scope=all');

    await expect(page.getByRole('progressbar')).toHaveText('002 / 005');
    expect((await snapshot(page)).questions).toEqual(first.questions);
    await expectNoHorizontalOverflow(page);
    for (let index = 1; index < 5; index++) {
      await answerCurrentQuestion(page);
      await page
        .getByRole('button', {
          name: index === 4 ? 'See results' : 'Next question',
          exact: true,
        })
        .click();
    }
    await expect(
      page.getByRole('heading', { name: 'Daily complete' }),
    ).toBeVisible();
    await expect(
      page.getByText('Level 3 · All generations', { exact: true }),
    ).toBeVisible();
    await page.goto('/?daily=2026-09-12&level=1&scope=gen-i');
    await expect(
      page.getByRole('button', { name: /^Play Daily Challenge/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Share result' }),
    ).toBeVisible();
  });
}

test('Daily assistance survives reload and cannot become an unassisted answer', async ({
  page,
}) => {
  await seedPlayer(page, {
    settings: { answerFlow: 'manual', soundVolume: 0 },
  });
  await page.goto('/?daily=2026-09-12');
  await chooseDaily(page);
  for (let index = 0; index < 4; index++) {
    await answerCurrentQuestion(page);
    await page
      .getByRole('button', { name: 'Next question', exact: true })
      .click();
  }
  await expect(page.getByText(/^Known as the/)).not.toBeVisible();
  await page.getByRole('button', { name: /^Show 4 choices/ }).click();
  await expect
    .poll(async () => (await snapshot(page)).questions[4]?.assistanceUsed)
    .toBe(1);
  await page.reload();

  await expect(page.getByRole('combobox', { name: 'Your answer' })).toHaveCount(
    0,
  );
  await expect(page.locator('.answer')).toHaveCount(4);
  await answerCurrentQuestion(page);
  await expect.poll(async () => (await snapshot(page)).answers.length).toBe(5);
  const saved = await snapshot(page);
  expect(saved.answers[4]?.cluesUsed).toBe(1);
  expect(saved.answers[4]?.unassistedSearch).toBe(false);
});

test('unavailable linked versions explain the problem without substituting questions', async ({
  page,
}) => {
  await page.goto(
    '/?daily=2026-09-12&level=3&scope=gen-i&rules=999&catalog=999',
  );
  await chooseDaily(page);
  await expect(page.getByRole('alert')).toContainText('no longer available');
  await expect(page.locator('.question')).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('complete typing supports search, removal, and submission while Pokémon search stays available', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await seedPlayer(page, {
    settings: {
      difficulty: 4,
      questionSelection: 'custom',
      questionTypes: ['type-check'],
      generations: ['I'],
      answerFlow: 'manual',
      soundVolume: 0,
    },
  });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Start training', exact: true })
    .click();
  const picker = page.getByRole('combobox', { name: 'Your types' });
  const check = page.getByRole('button', {
    name: 'Check answers',
    exact: true,
  });
  await expect(check).toBeDisabled();
  await picker.fill('a');
  const suggestions = page.getByRole('listbox');
  await expect(suggestions).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      value: 300,
    });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect
    .poll(async () => (await suggestions.boundingBox())!.height)
    .toBeLessThanOrEqual(120);
  expect(await page.evaluate(() => window.innerHeight)).toBe(800);
  const listBounds = (await suggestions.boundingBox())!;
  expect((await check.boundingBox())!.y).toBeGreaterThanOrEqual(
    listBounds.y + listBounds.height,
  );
  await picker.fill('not-a-type');
  await expect(page.getByRole('status')).toHaveText('No matching types');
  await picker.fill('fier');
  await picker.press('ArrowDown');
  await picker.press('Enter');
  await page.getByRole('button', { name: 'Remove Fire' }).click();
  await expect(check).toBeDisabled();
  const current = (await snapshot(page)).questions[0]!;
  for (const type of current.answer.correctOptions) {
    await picker.fill(type);
    await page
      .getByRole('option', { name: new RegExp(`^${type}$`, 'i') })
      .click();
  }
  await check.click();
  const feedback = page.getByRole('list', { name: 'Type answers' });
  await expect(feedback.getByRole('listitem')).toHaveCount(
    current.answer.correctOptions.length,
  );
  await expect(feedback).not.toContainText('Wrong pick');
  await expect(feedback).not.toContainText('Missed');
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Leave game', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Leave this game?' })
    .getByRole('button', { name: 'Leave game', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Start training', exact: true }),
  ).toBeEnabled();
  const save = await readSave(page);
  save.data.settings = {
    ...save.data.settings!,
    difficulty: 5,
    questionTypes: ['pokedex-scan'],
  };
  await writeSave(page, save);
  await page.goto('/?search=1');
  await page
    .getByRole('button', { name: 'Start training', exact: true })
    .click();
  await expect(
    page.getByRole('combobox', { name: 'Your answer' }),
  ).toBeVisible();
  await expect(page.locator('.answer')).toHaveCount(0);
  await answerCurrentQuestion(page);
  await expect(
    page.getByRole('button', { name: 'Next question', exact: true }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('Daily explains a catalog failure and retries without losing the challenge date', async ({
  page,
}) => {
  await page.route('**/*pokemon-catalog*.bin', (route) => route.abort());
  await page.goto('/?daily=2026-09-01');
  await expect(page.getByRole('alert')).toContainText(
    'Daily Challenge could not be loaded',
  );
  await expect(page.getByText('Sep 1, 2026', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Play Daily Challenge/ }),
  ).toBeDisabled();
  await page.unroute('**/*pokemon-catalog*.bin');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByRole('button', { name: /^Play Daily Challenge/ }).click();
  await expect(page.locator('.question')).toBeVisible();
});

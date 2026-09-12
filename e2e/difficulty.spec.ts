import type { ActiveGameSnapshot } from '../src/lib/storage/active-game-storage';
import {
  answerCurrentQuestion,
  chooseDaily,
  expect,
  expectNoHorizontalOverflow,
  test,
} from './fixtures';

const snapshot = async (page: Parameters<typeof chooseDaily>[0]) =>
  page.evaluate(
    () =>
      JSON.parse(
        sessionStorage.getItem('quizmon.active-game.v1')!,
      ) as ActiveGameSnapshot & { modifiers: unknown },
  );

for (const width of [360, 1280]) {
  test(`Daily is fixed at Level 3 and resumes one attempt at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() =>
      localStorage.setItem(
        'quizmon.training-settings.v2',
        JSON.stringify({
          difficulty: 5,
          generations: ['I'],
          formGroups: ['standard'],
          answerFlow: 'manual',
          soundVolume: 0,
        }),
      ),
    );
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
  await page.addInitScript(() =>
    localStorage.setItem(
      'quizmon.training-settings.v2',
      JSON.stringify({ answerFlow: 'manual', soundVolume: 0 }),
    ),
  );
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

test('complete typing uses an accessible type grid and search variants use the full answer field', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addInitScript(() => {
    const search = location.search.includes('search=1');
    localStorage.removeItem('quizmon.player');
    sessionStorage.clear();
    localStorage.setItem(
      'quizmon.training-settings.v2',
      JSON.stringify({
        difficulty: search ? 5 : 4,
        questionSelection: 'custom',
        questionTypes: [search ? 'pokedex-scan' : 'type-check'],
        generations: ['I'],
        answerFlow: 'manual',
        soundVolume: 0,
      }),
    );
  });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Start training', exact: true })
    .click();
  await expect(page.locator('.answer')).toHaveCount(18);
  const current = (await snapshot(page)).questions[0]!;
  for (const type of current.answer.correctOptions)
    await page
      .getByRole('button', { name: new RegExp(`^${type}$`, 'i') })
      .click();
  await page
    .getByRole('button', { name: 'Check answers', exact: true })
    .click();
  await expect(page.locator('.answer--wrong')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
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
  await page.route('**/*pokemon*.json', (route) => route.abort());
  await page.goto('/?daily=2026-09-01');
  await expect(page.getByRole('alert')).toContainText(
    'Daily Challenge could not be loaded',
  );
  await expect(page.getByText('Sep 1, 2026', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Play Daily Challenge/ }),
  ).toBeDisabled();
  await page.unroute('**/*pokemon*.json');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByRole('button', { name: /^Play Daily Challenge/ }).click();
  await expect(page.locator('.question')).toBeVisible();
});

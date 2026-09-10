import {
  catalog,
  expect,
  formatName,
  seedBrowserRandom,
  seedQuestionTraining,
  test,
  expectNoHorizontalOverflow,
} from './fixtures';

for (const questionType of ['sprite-match', 'whos-that-pokemon'] as const) {
  for (const correct of [true, false]) {
    test(`${questionType} answers and resumes (${correct ? 'correct' : 'incorrect'})`, async ({
      page,
    }) => {
      await page.setViewportSize(
        correct ? { width: 1280, height: 900 } : { width: 360, height: 780 },
      );
      await seedQuestionTraining(page, questionType);
      await seedBrowserRandom(page, `reverse-identity-${questionType}`);
      await page.goto('/');
      await page.getByRole('button', { name: 'Start training' }).click();
      await expect(
        page.getByRole('heading', {
          name:
            questionType === 'sprite-match'
              ? 'Sprite match'
              : 'Who’s that Pokémon?',
        }),
      ).toBeVisible();
      const answers = page.locator('.answer');
      await expect(answers).toHaveCount(4);
      const sources = await answers
        .locator('img')
        .evaluateAll((images) =>
          images.map((image) => image.getAttribute('src')),
        );
      await page.reload();
      await expect(answers).toHaveCount(4);
      expect(
        await answers
          .locator('img')
          .evaluateAll((images) =>
            images.map((image) => image.getAttribute('src')),
          ),
      ).toEqual(sources);
      let correctIndex: number;
      if (questionType === 'sprite-match') {
        const prompt = await page.locator('#question-prompt').textContent();
        const target = Object.entries(catalog.pokemon).find(([name]) =>
          prompt?.includes(`Find ${formatName(name)} (`),
        );
        if (!target) throw new Error(`Unknown Pokémon prompt: ${prompt}`);
        correctIndex = sources.findIndex((src) => src === target[1].sprite);
        for (let index = 0; index < 4; index++) {
          await expect(answers.nth(index)).toHaveAccessibleName(
            `Sprite ${index + 1}`,
          );
          await expect(
            answers.nth(index).locator('.answer__nameplate'),
          ).toBeHidden();
        }
        await expect(page.locator('.answer__sprite--silhouette')).toHaveCount(
          0,
        );
      } else {
        await expect(answers.locator('img')).toHaveCount(0);
        const silhouette = page.getByRole('img', {
          name: 'Mystery Pokémon silhouette',
        });
        await expect(silhouette).toHaveClass(/sprite--silhouette/);
        const source = await silhouette.getAttribute('src');
        const target = Object.entries(catalog.pokemon).find(
          ([, pokemon]) => pokemon.sprite === source,
        );
        if (!target) throw new Error(`Unknown silhouette source: ${source}`);
        correctIndex = (
          await answers.evaluateAll((buttons) =>
            buttons.map((button) => button.getAttribute('aria-label')),
          )
        ).indexOf(formatName(target[0]));
      }
      expect(correctIndex).toBeGreaterThanOrEqual(0);
      const selected = correct ? correctIndex : (correctIndex + 1) % 4;
      await expectNoHorizontalOverflow(page);
      if (correct) await page.keyboard.press(String(selected + 1));
      else await answers.nth(selected).click();
      await expect(answers.nth(selected)).toHaveClass(
        correct ? /answer--correct/ : /answer--wrong/,
      );
      await expect(page.locator('.sprite--silhouette')).toHaveCount(0);
      if (questionType === 'sprite-match') {
        for (const nameplate of await answers
          .locator('.answer__nameplate')
          .all())
          await expect(nameplate).toBeVisible();
      }
      await expect(
        page.getByRole('button', { name: 'Next question' }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole('progressbar', { name: 'Quiz progress' }),
      ).toHaveText('002 / 010');
      await expectNoHorizontalOverflow(page);
    });
  }
}

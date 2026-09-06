import {
  catalogData,
  expect,
  formatName,
  seedBrowserRandom,
  test,
} from './fixtures';

for (const questionType of ['evolution-link', 'generation-roundup'] as const) {
  for (const outcome of ['correct', 'incorrect'] as const) {
    test(`${questionType} supports mobile answers and reveals (${outcome})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.addInitScript((questionType) => {
        window.localStorage.setItem(
          'quizmon.training-settings.v2',
          JSON.stringify({
            generations: ['I', 'II'],
            questionTypes: [questionType],
            trainingMode: 'custom',
            soundEnabled: false,
            speedrunMode: false,
          }),
        );
      }, questionType);
      await seedBrowserRandom(page, 'lineage-mobile');
      await page.goto('/');
      await page.getByRole('button', { name: 'Start training' }).click();
      await expect(
        page.getByRole('heading', {
          name:
            questionType === 'evolution-link'
              ? 'Evolution link'
              : 'Generation roundup',
        }),
      ).toBeVisible();
      const answers = page.locator('.answer');
      await expect(answers).toHaveCount(4);
      await expect(
        page.locator('.question .pokemon-identity__number'),
      ).toHaveCount(0);
      if (questionType === 'evolution-link') {
        const chain = page.locator('.question-evolution-link');
        const before = await chain.locator('span').first().textContent();
        const first = Object.entries(catalogData.pokemon).find(
          ([name]) => formatName(name) === before,
        )?.[1];
        if (!first) throw new Error('Missing first evolution');
        const correct = first.evolvesTo[0]!;
        await expect(page.locator('.question img')).toHaveCount(0);
        for (const answer of await answers.all()) {
          const name = await answer.getAttribute('aria-label');
          if ((name === formatName(correct)) === (outcome === 'correct')) {
            await answer.click();
            break;
          }
        }
        await expect(chain.locator('strong')).toHaveText(formatName(correct));
        await expect(page.locator('.question img')).toHaveCount(0);
      } else {
        const prompt = await page.locator('#question-prompt').textContent();
        const generation = prompt?.match(/Generation ([IVX]+)\./)?.[1];
        if (!generation) throw new Error('Missing target generation');
        const values: string[] = [];
        for (const answer of await answers.all()) {
          await expect(answer.locator('.answer__generation')).toBeHidden();
          const label = await answer.getAttribute('aria-label');
          const pokemon = Object.entries(catalogData.pokemon).find(
            ([name]) => formatName(name) === label,
          )?.[1];
          if (!pokemon) throw new Error('Missing roundup option');
          values.push(pokemon.generation);
          if ((pokemon.generation === generation) === (outcome === 'correct'))
            await answer.click();
        }
        await page.getByRole('button', { name: 'Check answers' }).click();
        for (let index = 0; index < values.length; index += 1) {
          await expect(
            answers.nth(index).locator('.answer__generation'),
          ).toBeVisible();
          await expect(
            answers.nth(index).locator('.answer__generation'),
          ).toHaveText(`Generation ${values[index]}`);
        }
      }
      await expect(
        page.getByRole('button', { name: 'Next question' }),
      ).toBeVisible();
      await expect(
        page.locator('.question .pokemon-identity__number'),
      ).toHaveCount(0);
      if (outcome === 'correct')
        await expect(page.locator('.answer--wrong')).toHaveCount(0);
      else
        expect(await page.locator('.answer--wrong').count()).toBeGreaterThan(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/quizmon-${questionType}-${outcome}.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Next question' }).click();
      await expect(
        page.getByRole('progressbar', { name: 'Quiz progress' }),
      ).toHaveText('002 / 010');
    });
  }
}

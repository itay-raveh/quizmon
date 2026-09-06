import {
  catalogData,
  expect,
  formatName,
  seedBrowserRandom,
  test,
} from './fixtures';
import AxeBuilder from '@axe-core/playwright';

for (const questionType of ['type-twins', 'legend-hunt'] as const) {
  for (const outcome of ['correct', 'incorrect'] as const) {
    test(`${questionType} reveals every option after a mobile answer (${outcome})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.addInitScript((questionType) => {
        window.localStorage.setItem(
          'quizmon.training-settings.v2',
          JSON.stringify({
            generations: ['I'],
            questionTypes: [questionType],
            trainingMode: 'custom',
            soundEnabled: false,
            speedrunMode: false,
          }),
        );
      }, questionType);
      await seedBrowserRandom(page, 'twins-and-legends');
      await page.goto('/');
      await page.getByRole('button', { name: 'Start training' }).click();
      await expect(
        page.getByRole('heading', {
          name: questionType === 'type-twins' ? 'Type twins' : 'Legend hunt',
        }),
      ).toBeVisible();
      const answers = page.locator('.answer');
      await expect(answers).toHaveCount(4);
      let targetTypes: string[] = [];
      if (questionType === 'type-twins') {
        const name = await page
          .locator('.question-visual__subject-name .pokemon-identity__name')
          .textContent();
        const target = Object.entries(catalogData.pokemon).find(
          ([key]) => formatName(key) === name,
        )?.[1];
        if (!target) throw new Error('Missing Type twins target');
        targetTypes = target.types;
        expect(targetTypes).toHaveLength(2);
        await expect(
          page.locator('.question-visual__subject-types'),
        ).toBeHidden();
      }
      const options = [];
      for (const answer of await answers.all()) {
        const name = await answer.getAttribute('aria-label');
        const entry = Object.entries(catalogData.pokemon).find(
          ([key]) => formatName(key) === name,
        )?.[1];
        if (!entry) throw new Error('Missing answer metadata');
        options.push(entry);
        await expect(
          answer.locator(
            questionType === 'type-twins'
              ? '.answer__types'
              : '.answer__classification',
          ),
        ).toBeHidden();
      }
      const selected = options
        .map((pokemon, index) => ({
          index,
          correct:
            questionType === 'type-twins'
              ? pokemon.types.toSorted().join() ===
                targetTypes.toSorted().join()
              : pokemon.isLegendary || pokemon.isMythical,
        }))
        .filter(({ correct }) => correct === (outcome === 'correct'));
      for (const { index } of questionType === 'type-twins'
        ? selected.slice(0, 1)
        : selected)
        await answers.nth(index).click();
      if (questionType === 'legend-hunt')
        await page.getByRole('button', { name: 'Check answers' }).click();
      await expect(
        page.getByRole('button', { name: 'Next question' }),
      ).toBeVisible();
      for (const [index, pokemon] of options.entries()) {
        const answer = answers.nth(index);
        if (questionType === 'type-twins') {
          await expect(answer.locator('.answer__types')).toBeVisible();
          await expect(answer.locator('.type-badge')).toHaveCount(
            pokemon.types.length,
          );
          for (const type of pokemon.types)
            await expect(answer).toHaveAccessibleName(
              new RegExp(formatName(type)),
            );
        } else {
          const label = pokemon.isMythical
            ? 'Mythical'
            : pokemon.isLegendary
              ? 'Legendary'
              : 'Neither';
          await expect(answer.locator('.answer__classification')).toBeVisible();
          await expect(answer.locator('.answer__classification')).toHaveText(
            label,
          );
        }
      }
      if (questionType === 'type-twins')
        await expect(
          page.locator('.question-visual__subject-types .type-badge'),
        ).toHaveCount(2);
      if (outcome === 'correct')
        await expect(page.locator('.answer--wrong')).toHaveCount(0);
      else
        expect(await page.locator('.answer--wrong').count()).toBeGreaterThan(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (outcome === 'correct')
        expect(
          (await new AxeBuilder({ page }).include('.question').analyze())
            .violations,
        ).toEqual([]);
      await page.screenshot({
        path: `/tmp/quizmon-${questionType}-${outcome}.png`,
        fullPage: true,
      });
    });
  }
}

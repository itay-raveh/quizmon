import { defaultModifiers } from '../src/game/modifiers';
import { expect, expectNoHorizontalOverflow, test } from './fixtures';

for (const width of [320, 390]) {
  test(`League results show five stages without clipped stats at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(
      (modifiers) => {
        const result = {
          answers: Array.from({ length: 9 }, (_, index) => ({
            category: 'identity',
            cluesUsed: 0,
            correct: index < 8,
            generation: 'I',
            pokemonName: 'pikachu',
            points: index < 8 ? 1000 : 0,
            questionType: 'pokedex-scan',
            speedBonus: index < 8 ? 1500 : 0,
          })),
          contentVersion: 5,
          correctCount: 8,
          elapsedSeconds: 34,
          questionCount: 15,
          score: 29791,
          scoreVersion: 2,
        };
        sessionStorage.setItem(
          'quizmon.update-state.v1',
          JSON.stringify({
            url: location.href,
            values: {
              session: {
                phase: 'results',
                mode: { kind: 'league' },
                modifiers,
                result,
                bestResult: result,
                resultSaved: true,
                isNewBest: false,
                progressChanges: [],
                seed: 'league-results-layout',
              },
            },
          }),
        );
      },
      { ...defaultModifiers, reduceMotion: true, soundVolume: 0 },
    );
    await page.goto('/results');
    await expect(
      page.getByRole('heading', { name: 'League challenge ended' }),
    ).toBeVisible();
    await expect(page.locator('.results-list dt')).toHaveText([
      'Time',
      'Knowledge',
      'Speed',
      'Mastery',
    ]);
    await expect(
      page.locator('.result-details .league-progress > li'),
    ).toHaveCount(5);
    await expect(
      page.locator('.result-details [aria-current="step"]'),
    ).toContainText('III');
    await expectNoHorizontalOverflow(page);
    expect(
      await page
        .locator('.results-list dd')
        .evaluateAll((items) =>
          items.every((item) => item.scrollWidth <= item.clientWidth),
        ),
    ).toBe(true);
  });
}

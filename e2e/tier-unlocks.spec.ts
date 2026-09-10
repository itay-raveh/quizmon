import { defaultModifiers } from '../src/game/modifiers';
import { expect, expectNoHorizontalOverflow, test } from './fixtures';

for (const width of [320, 390, 1280]) {
  test(`Tier unlock celebrations fit at ${width}px`, async ({ page }) => {
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
                progressChanges: [
                  {
                    kind: 'badge',
                    id: 'many-paths',
                    label: 'Many Paths',
                    previousTier: 0,
                    tier: 1,
                    earned: true,
                    current: 10,
                    goal: 100,
                    delta: 1,
                  },
                  {
                    kind: 'badge',
                    id: 'world-tour',
                    label: 'World Tour',
                    previousTier: 1,
                    tier: 2,
                    earned: true,
                    current: 9,
                    goal: 9,
                    delta: 1,
                  },
                  {
                    kind: 'specialty',
                    specialty: 'type',
                    label: 'Type Specialist',
                    previousTier: 2,
                    tier: 3,
                    earned: true,
                    current: 1000,
                    goal: 1000,
                    delta: 3,
                  },
                ],
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
    const unlocked = page.locator('.reward[data-unlocked="true"]');
    await expect(unlocked).toHaveCount(3);
    await expect(unlocked.locator('.is-unlocked')).toHaveText([
      'Bronze unlocked',
      'Silver unlocked',
      'Gold unlocked',
    ]);
    await expect(page.locator('.reward-case')).toHaveAttribute(
      'data-playing',
      'false',
    );
    await expectNoHorizontalOverflow(page);
    expect(
      await unlocked.evaluateAll((rows) =>
        rows.every((row) => row.scrollWidth <= row.clientWidth),
      ),
    ).toBe(true);
  });
}

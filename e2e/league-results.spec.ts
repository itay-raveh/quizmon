import {
  expect,
  expectNoHorizontalOverflow,
  seedLeagueResults,
  test,
} from './fixtures';

for (const width of [320, 390]) {
  test(`League results show five stages without clipped stats at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await seedLeagueResults(page);
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

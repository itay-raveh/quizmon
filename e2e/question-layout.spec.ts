import type { Page } from '@playwright/test';
import { questionTypes } from '../src/game/questions/registry';
import { expect, seedBrowserRandom, test } from './fixtures';

const geometry = (page: Page) =>
  page.locator('.question').evaluate((panel) => {
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y + window.scrollY, height: rect.height };
    };
    return {
      panel: box(panel),
      title: box(panel.querySelector('h1')!),
      prompt: box(panel.querySelector('.question__instruction')!),
      response: box(panel.querySelector('.question__response')!),
      action: box(panel.querySelector('.question__action-slot')!),
    };
  });

const assertStable = (
  before: Awaited<ReturnType<typeof geometry>>,
  after: Awaited<ReturnType<typeof geometry>>,
) => {
  for (const region of [
    'panel',
    'title',
    'prompt',
    'response',
    'action',
  ] as const) {
    expect(
      Math.abs(after[region].x - before[region].x),
      `${region} horizontal shift`,
    ).toBeLessThan(1);
    expect(
      Math.abs(after[region].y - before[region].y),
      `${region} vertical shift`,
    ).toBeLessThan(1);
    expect(
      Math.abs(after[region].height - before[region].height),
      `${region} height shift`,
    ).toBeLessThan(1);
  }
};

const assertFits = async (page: Page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const clipped = await page
    .locator('.answer__name, .question__instruction')
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const container = (element.closest('.answer') ??
            element.closest('.question'))!.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(element);
          const text = range.getBoundingClientRect();
          return (
            text.left < container.left ||
            text.right > container.right ||
            text.bottom > container.bottom
          );
        })
        .map((element) => element.textContent),
    );
  expect(clipped).toEqual([]);
};

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'narrow', width: 320, height: 720 },
  { name: 'short-desktop', width: 1366, height: 650 },
  { name: 'zoom', width: 390, height: 844 },
]) {
  test(`keeps all question formats aligned and reveals stable on ${viewport.name}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedBrowserRandom(page, 'question-layout');
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem(
        'quizmon.training-settings.v2',
        JSON.stringify({
          generations: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'],
          questionTypes: [new URL(location.href).searchParams.get('auditType')],
          soundEnabled: false,
          speedrunMode: false,
          trainingMode: 'custom',
        }),
      );
    });
    const layouts: Awaited<ReturnType<typeof geometry>>[] = [];
    for (const type of questionTypes) {
      await test.step(type, async () => {
        await page.goto(`/?fresh=1&auditType=${type}`);
        await page.getByRole('button', { name: 'Start training' }).click();
        await expect(page.locator('.answer')).toHaveCount(4);
        await page.evaluate(() => document.fonts.ready);
        if (viewport.name === 'zoom')
          await page.addStyleTag({ content: 'html { font-size: 200%; }' });
        const before = await geometry(page);
        layouts.push(before);
        await assertFits(page);
        await page.locator('.answer').first().click();
        const check = page.getByRole('button', {
          name: 'Check answers',
          exact: true,
        });
        if (await check.count()) await check.click();
        await expect(
          page.getByRole('button', { name: 'Next question' }),
        ).toBeVisible();
        assertStable(before, await geometry(page));
        await assertFits(page);
      });
    }
    if (viewport.name === 'zoom') return;
    for (const region of ['title', 'prompt', 'response', 'action'] as const) {
      const positions = layouts.map((layout) => layout[region].y);
      expect(
        Math.max(...positions) - Math.min(...positions),
        `${region} spread: ${layouts.map((layout, index) => `${questionTypes[index]}=${Math.round(layout[region].y)}`).join(', ')}`,
      ).toBeLessThan(5);
    }
  });
}

test('Champion keeps search, choices, clues, and answer in a stable frame', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'quizmon.training-settings.v2',
      JSON.stringify({ soundEnabled: false, speedrunMode: false }),
    );
  });
  await page.goto('/?daily=2026-09-01&play=1');
  for (let index = 0; index < 4; index += 1) {
    await page.locator('.answer').first().click();
    const check = page.getByRole('button', {
      name: 'Check answers',
      exact: true,
    });
    if (await check.count()) await check.click();
    await page.getByRole('button', { name: 'Next question' }).click();
  }
  await expect(
    page.getByRole('combobox', { name: 'Your answer' }),
  ).toBeVisible();
  const before = await geometry(page);
  await page.getByRole('button', { name: /^Show 4 choices/ }).click();
  assertStable(before, await geometry(page));
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole('button', { name: /^Reveal another clue/ }).click();
    assertStable(before, await geometry(page));
  }
  await page.locator('.answer').first().click();
  await expect(page.getByRole('button', { name: 'See results' })).toBeVisible();
  assertStable(before, await geometry(page));
  await assertFits(page);
});

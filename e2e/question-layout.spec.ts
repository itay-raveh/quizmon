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
      hasStimulus: Boolean(panel.querySelector('.question__stimulus > *')),
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
    .locator('.answer__name, .question__instruction, .progress__label, .timer')
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
          timerDisplay: 'milliseconds',
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
        if (!before.hasStimulus) {
          expect(
            before.response.y - before.prompt.y - before.prompt.height,
            `${type} gap between instruction and answers`,
          ).toBeLessThan(viewport.name === 'zoom' ? 48 : 24);
        }
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
      const aligned =
        region === 'title' || region === 'prompt'
          ? layouts
          : layouts.filter((layout) => layout.hasStimulus);
      const positions = aligned.map((layout) => layout[region].y);
      expect(
        Math.max(...positions) - Math.min(...positions),
        `${region} spread: ${layouts.map((layout, index) => `${questionTypes[index]}=${Math.round(layout[region].y)}`).join(', ')}`,
      ).toBeLessThan(5);
    }
  });
}

for (const { width, assisted } of [320, 390, 1280].flatMap((width) =>
  [false, true].map((assisted) => ({ width, assisted })),
)) {
  test(`Champion keeps search compact and expands requested help at ${width}px (${assisted ? 'assisted' : 'search'})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
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
    const compact = await geometry(page);
    expect(
      compact.response.y - compact.prompt.y - compact.prompt.height,
    ).toBeLessThan(24);
    expect(
      compact.action.y - compact.response.y - compact.response.height,
    ).toBeLessThan(24);
    expect(compact.response.height).toBeLessThan(100);
    const choices = page.getByRole('button', { name: /^Show 4 choices/ });
    await expect(choices).toBeInViewport();
    await assertFits(page);
    if (!assisted) {
      await page.getByRole('combobox', { name: 'Your answer' }).fill('pika');
      await page.getByRole('option', { name: 'Pikachu', exact: true }).click();
      await page.getByRole('button', { name: 'Guess', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'See results' }),
      ).toBeVisible();
      await expect(page.locator('.clue-board')).toHaveCount(0);
      const portrait = await page.locator('.sprite-frame').boundingBox();
      const panel = await page.locator('.question').boundingBox();
      expect(portrait).not.toBeNull();
      expect(panel).not.toBeNull();
      expect(portrait!.width).toBeGreaterThanOrEqual(140);
      expect(
        Math.abs(
          portrait!.x + portrait!.width / 2 - panel!.x - panel!.width / 2,
        ),
      ).toBeLessThan(1);
      await assertFits(page);
      return;
    }
    await choices.click();
    await expect(page.locator('.answer')).toHaveCount(4);
    await page.getByRole('button', { name: /^Reveal another clue/ }).click();
    const before = await geometry(page);
    for (let index = 0; index < 2; index += 1) {
      await page.getByRole('button', { name: /^Reveal another clue/ }).click();
      assertStable(before, await geometry(page));
    }
    await page.locator('.answer').first().click();
    await expect(
      page.getByRole('button', { name: 'See results' }),
    ).toBeVisible();
    assertStable(before, await geometry(page));
    await assertFits(page);
  });
}

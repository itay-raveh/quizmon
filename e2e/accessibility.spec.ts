import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { completeTrainingRound, expect, test } from './fixtures';

const expectNoAccessibilityViolations = async (page: Page) => {
  await page.evaluate(async () => {
    await Promise.allSettled(
      document.getAnimations().map((animation) => animation.finished),
    );
  });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
};

const expectNoHorizontalOverflow = async (page: Page) => {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
};

const expectNoHorizontalClipping = async (page: Page) => {
  const offenders = await page.evaluate(() =>
    [...document.body.querySelectorAll<HTMLElement>('*')]
      .filter((element) => {
        if (element.closest('.visually-hidden,[hidden]')) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 1 &&
          rect.height > 1 &&
          (rect.left < -1 || rect.right > window.innerWidth + 1)
        );
      })
      .map((element) => ({
        className: element.className,
        tagName: element.tagName,
        text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80),
      })),
  );

  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
};

const expectCardContentToFit = async (page: Page) => {
  const card = page.locator('.trainer-card');
  expect(
    await card.evaluate(
      (element) => element.scrollHeight - element.clientHeight,
    ),
  ).toBeLessThanOrEqual(1);
};

test('keeps the landing screen accessible', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toBeEnabled();
  await expectNoAccessibilityViolations(page);
});

test('keeps Settings accessible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test('keeps questions and results accessible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(page.locator('.question')).toBeVisible();
  await expectNoAccessibilityViolations(page);

  await completeTrainingRound(page);
  await expectNoAccessibilityViolations(page);
});

test('keeps the Trainer Card accessible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Trainer Card' }).click();
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test('reflows when text is enlarged to 200%', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expectNoHorizontalOverflow(page);
  await expectNoHorizontalClipping(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoHorizontalClipping(page);
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(page.locator('.question')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoHorizontalClipping(page);

  await completeTrainingRound(page);
  await expect(page.locator('.results')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoHorizontalClipping(page);

  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.getByRole('button', { name: 'Trainer Card' }).click();
  await expect(
    page.getByRole('article', { name: 'Trainer Card front' }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoHorizontalClipping(page);
  await expectCardContentToFit(page);

  await page.getByRole('button', { name: 'View badges' }).click();
  await expect(
    page.getByRole('article', { name: 'Trainer Card badge case' }),
  ).toBeVisible();
  await expectNoHorizontalClipping(page);
  await expectCardContentToFit(page);
});

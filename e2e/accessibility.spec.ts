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
  const card = page.locator('.trainer-card, .trainer-badge-case');
  expect(
    await card.evaluate(
      (element) => element.scrollHeight - element.clientHeight,
    ),
  ).toBeLessThanOrEqual(1);
};

const expectContentToFitHorizontally = async (page: Page, selector: string) => {
  const offenders = await page.locator(selector).evaluate((container) => {
    const bounds = container.getBoundingClientRect();

    return [...container.querySelectorAll<HTMLElement>('*')]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }

        const rect = element.getBoundingClientRect();
        return (
          rect.width > 1 &&
          rect.height > 1 &&
          (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
        );
      })
      .map((element) => ({
        className: element.className,
        tagName: element.tagName,
        text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80),
      }));
  });

  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
};

const expectControlsToContainTheirContent = async (
  page: Page,
  selector: string,
) => {
  const offenders = await page.locator(selector).evaluateAll((controls) =>
    controls
      .filter(
        (control) =>
          control.scrollWidth - control.clientWidth > 1 ||
          control.scrollHeight - control.clientHeight > 1,
      )
      .map((control) => ({
        className: control.getAttribute('class'),
        text: control.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80),
      })),
  );

  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
};

test('keeps the core experience accessible', async ({ page }) => {
  // This walkthrough runs a full round and multiple full-page axe scans.
  test.slow();
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toBeEnabled();
  await expectNoAccessibilityViolations(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(page.locator('.question')).toBeVisible();
  await expectNoAccessibilityViolations(page);

  await completeTrainingRound(page);
  await expectNoAccessibilityViolations(page);

  await page.goto('/');
  await page.getByRole('button', { name: 'Trainer profile' }).click();
  await expect(
    page.getByRole('article', { name: 'Trainer Card' }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Card', exact: true }).focus();
  await expect(
    page.getByRole('button', { name: 'Card', exact: true }),
  ).toHaveCSS('outline-color', 'rgb(255, 251, 234)');
  await page.getByRole('button', { name: 'Badges', exact: true }).focus();
  await expect(
    page.getByRole('button', { name: 'Badges', exact: true }),
  ).toHaveCSS('outline-color', 'rgb(8, 59, 126)');

  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'League Badge Case' }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
  const badge = page.locator('.trainer-badge').first();
  await badge.focus();
  await expect(badge).toHaveCSS('outline-color', 'rgb(255, 251, 234)');
  await badge.click();
  await expect(page.locator('.trainer-badge-dialog')).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Close badge details' }).click();

  await page.getByRole('button', { name: 'Titles', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Trainer Titles collection' }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.locator('.trainer-title').first().click();
  await expect(page.locator('.trainer-title-dialog')).toBeVisible();
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
  await page.getByRole('button', { name: 'Trainer profile' }).click();
  await expect(
    page.getByRole('article', { name: 'Trainer Card' }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoHorizontalClipping(page);
  await expectCardContentToFit(page);
  await expectControlsToContainTheirContent(page, '.trainer-passport__view');

  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'League Badge Case' }),
  ).toBeVisible();
  await expectNoHorizontalClipping(page);
  await expectCardContentToFit(page);
  await expectControlsToContainTheirContent(page, '.trainer-passport__view');
  await page.locator('.trainer-badge').first().click();
  await expect(page.locator('.trainer-badge-dialog')).toBeVisible();
  await expectNoHorizontalClipping(page);
  await expectContentToFitHorizontally(page, '.trainer-badge-dialog');
  await page.getByRole('button', { name: 'Close badge details' }).click();

  await page.getByRole('button', { name: 'Titles', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Trainer Titles collection' }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoHorizontalClipping(page);
  await expectControlsToContainTheirContent(page, '.trainer-passport__view');
  await page.locator('.trainer-title').first().click();
  await expect(page.locator('.trainer-title-dialog')).toBeVisible();
  await expectNoHorizontalClipping(page);
  await expectContentToFitHorizontally(page, '.trainer-title-dialog');
});

import { expect, test } from './fixtures';

test('keeps grouped settings reachable throughout a game on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();

  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Settings' })).toBeFocused();
  await expect(
    dialog.getByRole('button', { name: 'Save settings' }),
  ).toBeVisible();
  await expect(dialog.getByRole('contentinfo')).toHaveCount(0);
  await expect(dialog.getByRole('tab', { name: 'Training' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    dialog.getByRole('radio', { name: '10 Standard' }),
  ).toBeChecked();
  await dialog.getByText('Quick', { exact: true }).click();
  await expect(dialog.getByRole('radio', { name: '5 Quick' })).toBeChecked();
  await expect(
    dialog.getByText('Choose which generations can appear.'),
  ).toHaveCount(0);
  await expect(
    dialog.getByText('Pick the formats you want to practice.'),
  ).toHaveCount(0);
  const selectAllGenerations = dialog.getByRole('button', {
    name: 'Select all generations',
  });
  await selectAllGenerations.click();
  await expect(dialog.getByLabel('IX', { exact: true })).toBeChecked();
  await dialog
    .getByRole('button', { name: 'Deselect all generations' })
    .click();
  await expect(dialog.getByLabel('I', { exact: true })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Select all generations' }).click();
  await dialog
    .getByRole('button', { name: 'Select all question types' })
    .click();
  const identityGroup = dialog.getByRole('button', {
    name: 'Identity 5 / 5 selected',
  });
  const knowledgeGroup = dialog.getByRole('button', {
    name: 'General knowledge 5 / 5 selected',
  });
  const battleGroup = dialog.getByRole('button', {
    name: 'Battle knowledge 5 / 5 selected',
  });
  await expect(identityGroup).toHaveAttribute('aria-expanded', 'true');
  await expect(knowledgeGroup).toHaveAttribute('aria-expanded', 'false');
  await expect(battleGroup).toHaveAttribute('aria-expanded', 'false');
  await battleGroup.click();
  await expect(identityGroup).toHaveAttribute('aria-expanded', 'false');
  await expect(battleGroup).toHaveAttribute('aria-expanded', 'true');
  await expect(
    dialog.getByRole('group', { name: 'Battle knowledge question types' }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('checkbox', { includeHidden: true, name: 'Battle view' }),
  ).toBeChecked();
  await expect(
    dialog.getByRole('checkbox', { includeHidden: true, name: 'Counter pick' }),
  ).toBeChecked();
  await expect(
    dialog.getByRole('checkbox', {
      includeHidden: true,
      name: 'Evolution shift',
    }),
  ).toBeChecked();
  await expect(dialog.getByLabel('Evolution trail')).toHaveCount(0);
  await expect(dialog.getByLabel('Evolution order')).toHaveCount(0);
  await expect(
    dialog.getByRole('checkbox', { includeHidden: true, name: 'Odd one out' }),
  ).toBeChecked();
  await expect(dialog.getByLabel('Missing evolution')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'About Counter pick' }).click();
  const questionTypeHelp = page.getByRole('note');
  await expect(questionTypeHelp).toBeVisible();
  await expect(questionTypeHelp).toContainText(
    'Pick a Pokémon with a super-effective attack type.',
  );
  await page.keyboard.press('Escape');
  await expect(questionTypeHelp).toBeHidden();
  await dialog
    .getByRole('button', { name: 'Deselect all question types' })
    .click();
  await expect(
    dialog.getByRole('checkbox', {
      includeHidden: true,
      name: 'Pokédex scan',
    }),
  ).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Save settings' }).click();
  await expect(
    dialog.getByText('Choose at least one question type.'),
  ).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Question types' }),
  ).toBeFocused();
  await dialog
    .getByRole('button', { name: 'Select all question types' })
    .click();
  await expect(
    dialog.getByText('Choose at least one question type.'),
  ).toHaveCount(0);
  await dialog.getByRole('tab', { name: 'Experience' }).click();
  await expect(dialog.getByText('Play experience')).toBeVisible();
  await expect(dialog.getByLabel('Quick transitions')).toBeVisible();
  await dialog.getByRole('tab', { name: 'Experience' }).press('ArrowLeft');
  await expect(dialog.getByRole('tab', { name: 'Training' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused();

  await page.getByRole('button', { name: 'Start training' }).click();
  const timer = page.locator('.timer');
  await expect
    .poll(() => timer.getAttribute('aria-label'))
    .not.toBe('Elapsed time 00:00:00');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('tab', { name: 'Experience' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const pausedAt = await timer.getAttribute('aria-label');
  await page.waitForTimeout(1100);
  await expect(timer).toHaveAttribute('aria-label', pausedAt!);
  await dialog.getByRole('tab', { name: 'Training' }).click();
  await expect(
    dialog.getByText('Training changes apply to your next game.'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect.poll(() => timer.getAttribute('aria-label')).not.toBe(pausedAt);

  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: 'Training' }).click();
  const mobileControlMetrics = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const close = element
      .querySelector('.dialog-close')
      ?.getBoundingClientRect();
    const selectionToggle = element
      .querySelector('.selection-toggle')
      ?.getBoundingClientRect();
    const roundLength = element
      .querySelector('.selection-tile--round-length .selection-tile__surface')
      ?.getBoundingClientRect();
    const questionTypeHelp = element
      .querySelector('.question-type-tile__help')
      ?.getBoundingClientRect();
    return {
      closeHeight: close?.height,
      closeWidth: close?.width,
      dialogHeight: bounds.height,
      dialogWidth: bounds.width,
      helpHeight: questionTypeHelp?.height,
      helpWidth: questionTypeHelp?.width,
      roundLengthHeight: roundLength?.height,
      selectionToggleHeight: selectionToggle?.height,
    };
  });
  expect(mobileControlMetrics.dialogHeight).toBe(844);
  expect(mobileControlMetrics.dialogWidth).toBe(320);
  expect(mobileControlMetrics.closeHeight).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.closeWidth).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.helpHeight).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.helpWidth).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.roundLengthHeight).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.selectionToggleHeight).toBeGreaterThanOrEqual(44);
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  const footerMetrics = await page
    .getByRole('contentinfo')
    .evaluate((footer) => ({
      clientWidth: footer.clientWidth,
      fontSize: Number.parseFloat(getComputedStyle(footer).fontSize),
      scrollWidth: footer.scrollWidth,
      groupLineCenters: [...footer.querySelectorAll('.site-footer__group')].map(
        (group) =>
          new Set(
            [...group.children].map((child) => {
              const bounds = child.getBoundingClientRect();
              return Math.round(bounds.top + bounds.height / 2);
            }),
          ).size,
      ),
    }));
  expect(footerMetrics.groupLineCenters).toEqual([1, 1]);
  expect(footerMetrics.fontSize).toBeGreaterThanOrEqual(14);
  expect(footerMetrics.scrollWidth).toBeLessThanOrEqual(
    footerMetrics.clientWidth,
  );
  const renderedFooterText = await page
    .getByRole('contentinfo')
    .evaluate((footer) =>
      [...footer.querySelectorAll('.site-footer__group')]
        .map((group) =>
          (group as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
        )
        .join(' '),
    );
  expect(renderedFooterText).toBe(
    'Logo: TextStudio · Custom art: @beresteyskaya Data: PokéAPI · Code: GitHub',
  );
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: '@beresteyskaya' }),
  ).toHaveAttribute('href', 'https://www.fiverr.com/beresteyskaya');
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'GitHub' }),
  ).toHaveAttribute('href', 'https://github.com/itay-raveh/quizmon');
});

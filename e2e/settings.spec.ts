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
  await expect(dialog.getByRole('radio', { name: 'Custom' })).toBeChecked();
  await expect(
    dialog.getByText('10 questions using the question types you choose.'),
  ).toBeVisible();
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
    name: 'Identity 4 / 4 selected',
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
  await dialog.getByText('League', { exact: true }).click();
  await expect(
    dialog.getByText(
      '10 questions with every question type. Quick Attack and Perfect Form can be earned.',
    ),
  ).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Question types' }),
  ).toHaveCount(0);
  await dialog.getByRole('tab', { name: 'Experience' }).click();
  await expect(
    dialog.getByRole('group', { name: 'Answer flow' }),
  ).toBeVisible();
  await expect(dialog.getByRole('radio', { name: /Instant/ })).toBeChecked();
  await expect(dialog.getByRole('group', { name: 'Timer' })).toBeVisible();
  await expect(
    dialog.getByRole('radio', { name: 'Seconds', exact: true }),
  ).toBeChecked();
  await expect(
    dialog.getByRole('slider', { name: 'Sound effects' }),
  ).toHaveValue('0');
  await expect(dialog.getByLabel('Reduce motion')).not.toBeChecked();
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
      selectionToggleHeight: selectionToggle?.height,
    };
  });
  expect(mobileControlMetrics.dialogHeight).toBe(844);
  expect(mobileControlMetrics.dialogWidth).toBe(320);
  expect(mobileControlMetrics.closeHeight).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.closeWidth).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.helpHeight).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.helpWidth).toBeGreaterThanOrEqual(44);
  expect(mobileControlMetrics.selectionToggleHeight).toBeGreaterThanOrEqual(44);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
});

import { readSave } from './database-fixture';
import { expect, test } from './fixtures';

test('keeps training customization separate from general settings on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Customize training', exact: true })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Customize training' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Customize training' }),
  ).toBeFocused();
  await expect(
    dialog.getByRole('button', { name: 'Save settings' }),
  ).toBeVisible();
  await expect(dialog.getByRole('contentinfo')).toHaveCount(0);
  await expect(dialog.getByRole('tablist')).toHaveCount(0);
  await expect(
    dialog.getByRole('checkbox', { name: 'Customize questions' }),
  ).toBeChecked();
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
    name: 'Identity 7 / 7 selected',
  });
  const knowledgeGroup = dialog.getByRole('button', {
    name: 'General knowledge 18 / 18 selected',
  });
  const battleGroup = dialog.getByRole('button', {
    name: 'Battle knowledge 13 / 13 selected',
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
  await expect(dialog.getByLabel('Baby Pokémon')).toHaveCount(0);
  await expect(dialog.getByLabel('Egg-group connections')).toHaveCount(0);
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
  await dialog.getByText('Customize questions', { exact: true }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Question types' }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Customize training', exact: true }),
  ).toBeFocused();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(
    settings.getByRole('heading', { name: 'Settings', exact: true }),
  ).toBeFocused();
  await expect(settings.getByRole('tablist')).toHaveCount(0);
  await expect(
    settings.getByRole('group', { name: 'Answer flow' }),
  ).toBeVisible();
  await expect(settings.getByRole('radio', { name: /Instant/ })).toBeChecked();
  await expect(settings.getByRole('group', { name: 'Timer' })).toBeVisible();
  await expect(
    settings.getByRole('radio', { name: 'Seconds', exact: true }),
  ).toBeChecked();
  await expect(
    settings.getByRole('slider', { name: 'Sound effects' }),
  ).toHaveValue('0');
  await expect(settings.getByLabel('Reduce motion')).not.toBeChecked();
  const backup = settings
    .locator('summary')
    .filter({ hasText: 'Backup & restore' });
  await expect(
    settings.getByRole('button', { name: 'Download backup' }),
  ).toHaveCount(0);
  await backup.focus();
  await backup.press('Enter');
  await expect(
    settings.getByRole('button', { name: 'Download backup' }),
  ).toBeVisible();
  await backup.press('Space');
  await expect(
    settings.getByRole('button', { name: 'Download backup' }),
  ).toHaveCount(0);
  await expect(backup).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(settings).toBeHidden();
  await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused();

  await page.getByRole('button', { name: 'Start training' }).click();
  const timer = page.locator('.timer');
  await expect(timer).not.toHaveAttribute(
    'aria-label',
    'Elapsed time 00:00:00',
  );
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Leave game' }).click();
});

test('keeps unavailable custom preferences without blocking other eligible families', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Customize training', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Customize training' });
  await dialog.getByRole('button', { name: /General knowledge/ }).click();
  await dialog.getByText('Generation roundup', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Save settings' }).click();
  await expect(dialog).toBeHidden();
  const settings = (await readSave(page)).data.settings!;
  expect(settings.questionTypes).toEqual([
    'pokedex-scan',
    'generation-roundup',
  ]);
  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(
    page.getByRole('heading', { name: 'Pokédex scan' }),
  ).toBeVisible();
});

test('dismisses settings from the backdrop but keeps inside clicks open', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('heading', { name: 'Settings' }).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(1, 1);
  await expect(dialog).toBeHidden();
});

for (const width of [390, 1280]) {
  test(`filters form groups and remembers unavailable preferences at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Customize training', exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Customize training' });
    const mega = dialog.getByRole('checkbox', { name: 'Mega', exact: true });
    const gmax = dialog.getByRole('checkbox', {
      name: 'Gigantamax',
      exact: true,
    });
    await expect(mega).toBeDisabled();
    await expect(gmax).toBeDisabled();
    await dialog
      .getByRole('checkbox', { name: 'VI', exact: true })
      .locator('..')
      .click();
    await expect(mega).toBeChecked();
    await mega.locator('..').click();
    await dialog
      .getByRole('checkbox', { name: 'VI', exact: true })
      .locator('..')
      .click();
    await dialog
      .getByRole('checkbox', { name: 'VIII', exact: true })
      .locator('..')
      .click();
    await expect(gmax).toBeChecked();
    await page.screenshot({ path: testInfo.outputPath('form-settings.png') });
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await dialog.getByRole('button', { name: 'Save settings' }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await page
      .getByRole('button', { name: 'Customize training', exact: true })
      .click();
    await dialog
      .getByRole('checkbox', { name: 'VI', exact: true })
      .locator('..')
      .click();
    await expect(mega).not.toBeChecked();
    await expect(gmax).toBeChecked();
    await dialog
      .getByRole('checkbox', { name: 'Standard', exact: true })
      .locator('..')
      .click();
    await dialog
      .getByRole('checkbox', { name: 'Regional', exact: true })
      .locator('..')
      .click();
    await gmax.locator('..').click();
    await dialog.getByRole('button', { name: 'Save settings' }).click();
    await expect(dialog.getByRole('alert')).toHaveText(
      'Choose at least one available form group.',
    );
    await expect(
      dialog.getByRole('heading', { name: 'Forms', exact: true }),
    ).toBeFocused();
    await gmax.locator('..').click();
    await dialog.getByRole('button', { name: 'Save settings' }).click();
    await expect(dialog).not.toBeVisible();
  });
}

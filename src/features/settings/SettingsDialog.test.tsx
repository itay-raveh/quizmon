import { generations } from '@/domain/pokemon/types';
import { resetLocalSave } from '../../../tests/fixtures/local-save';
import { defaultGameSettings } from '@/domain/settings/game-settings';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { catalog } from '../../../tests/fixtures/catalog';
import { SettingsDialog } from './SettingsDialog';
import * as settingsValidation from './settings-validation';

const dialogMethods = ['showModal', 'close'] as const;
const originalDialogMethods = dialogMethods.map((method) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, method),
);

beforeEach(async () => {
  await resetLocalSave();
  for (const method of dialogMethods) {
    Object.defineProperty(HTMLDialogElement.prototype, method, {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = method === 'showModal';
      },
    });
  }
});

afterEach(() => {
  cleanup();
  dialogMethods.forEach((method, index) => {
    const original = originalDialogMethods[index];
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, method, original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, method);
  });
});

it('shows preferences directly and opens backup only on request without calculating Training eligibility', async () => {
  const validate = vi.spyOn(
    settingsValidation,
    'getTrainingSettingsValidation',
  );
  render(
    <SettingsDialog
      catalog={catalog}
      settings={defaultGameSettings}
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  expect(screen.queryByRole('tablist')).toBeNull();
  expect(screen.getByRole('group', { name: 'Sound' })).toBeVisible();
  expect(
    screen.queryByRole('group', { name: 'Difficulty', hidden: true }),
  ).toBeNull();
  expect(screen.queryByRole('button', { name: 'Download backup' })).toBeNull();
  const disclosure = screen.getByText('Backup & restore').closest('details')!;
  disclosure.open = true;
  fireEvent(disclosure, new Event('toggle'));
  expect(
    await screen.findByRole('button', { name: 'Download backup' }),
  ).toBeVisible();
  expect(validate).not.toHaveBeenCalled();
  validate.mockRestore();
});

it('shows only Training controls in Customize training', () => {
  render(
    <SettingsDialog
      catalog={catalog}
      section="training"
      settings={defaultGameSettings}
      trainingChangesApplyNextGame
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  expect(
    screen.getByRole('dialog', { name: 'Customize training' }),
  ).toBeVisible();
  expect(screen.queryByRole('tablist', { hidden: true })).toBeNull();
  expect(screen.getByRole('group', { name: 'Difficulty' })).toBeVisible();
  expect(
    screen.getByText('Training changes apply to your next game.'),
  ).toBeVisible();
  expect(
    screen.queryByRole('group', { name: 'Sound', hidden: true }),
  ).toBeNull();
  expect(screen.queryByText('Download backup')).toBeNull();
});

it('keeps an invalid Training draft open and focuses the invalid generation section', async () => {
  const onSave = vi.fn();
  render(
    <SettingsDialog
      catalog={catalog}
      section="training"
      settings={{ ...defaultGameSettings, generations: [] }}
      onClose={vi.fn()}
      onSave={onSave}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByText('Choose at least one generation.')).toHaveAttribute(
    'role',
    'alert',
  );
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Generations' })).toHaveFocus(),
  );
  expect(
    screen.getByRole('dialog', { name: 'Customize training' }),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Select all generations' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      ...defaultGameSettings,
      generations: [...generations],
    }),
  );
});

it('saves general changes without validating inaccessible Training controls', async () => {
  const onSave = vi.fn();
  const settings = { ...defaultGameSettings, generations: [] };
  render(
    <SettingsDialog
      catalog={catalog}
      settings={settings}
      onClose={vi.fn()}
      onSave={onSave}
    />,
  );
  fireEvent.change(screen.getByRole('slider', { name: 'Sound effects' }), {
    target: { value: '0.2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({ ...settings, soundVolume: 0.2 }),
  );
});

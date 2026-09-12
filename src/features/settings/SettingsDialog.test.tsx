import { fireEvent, render, screen } from '@testing-library/react';
import { defaultGameSettings } from '@/domain/settings/game-settings';
import { SettingsDialog } from './SettingsDialog';
import * as validation from './settings-validation';
import { catalog } from '../../../tests/fixtures/catalog';

vi.mock('@/hooks/useModalDialog', () => ({
  useModalDialog: () => ({
    dialog: { current: null },
    dialogProps: { open: true },
    closeDialog: vi.fn(),
  }),
}));

it('reuses question eligibility for experience changes and recomputes for difficulty changes', () => {
  const validate = vi.spyOn(validation, 'getTrainingSettingsValidation');
  render(
    <SettingsDialog
      catalog={catalog}
      settings={defaultGameSettings}
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  const initial = validate.mock.calls.length;
  fireEvent.click(screen.getByRole('tab', { name: 'Experience' }));
  fireEvent.change(screen.getByRole('slider', { name: 'Sound effects' }), {
    target: { value: '0.5' },
  });
  fireEvent.change(screen.getByRole('slider', { name: 'Sound effects' }), {
    target: { value: '0.3' },
  });
  expect(screen.getByRole('slider', { name: 'Sound effects' })).toHaveValue(
    '0.3',
  );
  expect(validate).toHaveBeenCalledTimes(initial);
  fireEvent.click(screen.getByRole('tab', { name: 'Training' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Level 2' }));
  expect(validate).toHaveBeenCalledTimes(initial + 1);
  validate.mockRestore();
});

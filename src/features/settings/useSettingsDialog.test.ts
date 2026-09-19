import { act, renderHook } from '@testing-library/react';
import { parseUpdateSave } from '@/domain/player/update-save';
import { defaultGameSettings } from '@/domain/settings/game-settings';
import { saveUpdateState } from '../installation/update-session';
import { useSettingsDialog } from './useSettingsDialog';

it('opens the requested section and includes it in the update snapshot', () => {
  const { result } = renderHook(() =>
    useSettingsDialog({
      dispatch: vi.fn(),
      markGenerationKnown: vi.fn(),
      pauseTimer: vi.fn(),
      session: { phase: 'landing' },
      setSettings: vi.fn().mockResolvedValue(true),
      startTimer: vi.fn(),
    }),
  );
  act(() => result.current.openTraining());
  expect(result.current.isOpen).toBe(true);
  expect(result.current.section).toBe('training');
  expect(saveUpdateState()).toBe(true);
  expect(
    parseUpdateSave(
      JSON.parse(sessionStorage.getItem('quizmon.update-state.v1') ?? '{}'),
    ).values,
  ).toMatchObject({
    'settings-open': true,
    'settings-section': 'training',
  });
  act(() => result.current.close());
  act(() => result.current.open());
  expect(result.current.section).toBe('general');
  expect(result.current.isOpen).toBe(true);
});

it('keeps the dialog open when settings could not be persisted', async () => {
  const markGenerationKnown = vi.fn();
  const { result } = renderHook(() =>
    useSettingsDialog({
      dispatch: vi.fn(),
      markGenerationKnown,
      pauseTimer: vi.fn(),
      session: { phase: 'landing' },
      setSettings: vi.fn().mockResolvedValue(false),
      startTimer: vi.fn(),
    }),
  );
  act(() => result.current.openTraining());
  await act(() => result.current.save(defaultGameSettings));
  expect(result.current.isOpen).toBe(true);
  expect(result.current.section).toBe('training');
  expect(markGenerationKnown).not.toHaveBeenCalled();
});

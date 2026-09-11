import type { GameResult } from '@/domain/quiz/types';
import { defaultGameSettings } from '@/domain/settings/game-settings';
import { useDailyChallenge } from '@/features/daily/useDailyChallenge';
import { readDailyResult, saveResult } from '@/lib/storage/results-storage';
import { act, renderHook } from '@testing-library/react';

it('keeps an unsaved completion visible and adopts a later saved result', () => {
  localStorage.clear();
  window.history.replaceState(null, '', '/?daily=2026-09-01');
  const completed: GameResult = {
    answers: [],
    contentVersion: 1,
    correctCount: 0,
    elapsedSeconds: 10,
    questionCount: 5,
    score: 0,
  };
  const { result, unmount } = renderHook(() =>
    useDailyChallenge({
      settings: defaultGameSettings,
      refreshSavedData: vi.fn(),
      startGame: vi.fn(),
    }),
  );
  expect(result.current.result).toBeNull();
  expect(result.current.resultSaved).toBe(false);

  act(() => result.current.recordCompletion(completed, false));
  expect(result.current.result).toEqual(completed);
  expect(result.current.resultSaved).toBe(false);
  expect(readDailyResult('2026-09-01')).toBeNull();

  act(() => {
    window.dispatchEvent(new Event('focus'));
  });
  expect(result.current.result).toEqual(completed);
  expect(result.current.resultSaved).toBe(false);

  saveResult({ kind: 'daily', date: '2026-09-01' }, completed);
  act(() => {
    window.dispatchEvent(new StorageEvent('storage'));
  });
  expect(result.current.result).toEqual(completed);
  expect(result.current.resultSaved).toBe(true);
  unmount();
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

import { act, renderHook } from '@testing-library/react';
import { useDailyChallenge } from '@/app/useDailyChallenge';
import { defaultModifiers } from '@/game/modifiers';
import { readDailyResult, saveResult } from '@/game/storage';
import type { GameResult } from '@/game/types';

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
      modifiers: defaultModifiers,
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

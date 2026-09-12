import type { StartGame } from '@/app/game-session';
import type { ActiveGameSnapshot } from '@/lib/storage/active-game-storage';
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
      resume: vi.fn(),
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

it('starts one fixed all-generation Daily independently of Training settings', async () => {
  const { catalog } = await import('../../../tests/fixtures/catalog');
  const { generations, formGroups } = await import('@/domain/pokemon/types');
  const { writeActiveGame } = await import('@/lib/storage/active-game-storage');
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/?daily=2026-09-12');
  const startGame = vi.fn<StartGame>();
  const resume = vi.fn<(snapshot: ActiveGameSnapshot) => void>();
  const { result, unmount } = renderHook(() =>
    useDailyChallenge({
      catalog,
      settings: {
        ...defaultGameSettings,
        difficulty: 5,
        generations: ['I'],
        formGroups: ['standard'],
        questionSelection: 'custom',
        questionTypes: ['pokedex-scan'],
      },
      refreshSavedData: vi.fn(),
      startGame,
      resume,
    }),
  );
  act(() => result.current.start());
  expect(startGame).toHaveBeenCalledOnce();
  const [questions, settings, mode, seed] = startGame.mock.calls[0]!;
  expect(settings).toMatchObject({
    difficulty: 3,
    generations,
    formGroups,
    questionSelection: 'automatic',
  });
  expect(mode).toEqual({
    kind: 'daily',
    date: '2026-09-12',
    track: { difficulty: 3, scope: 'all' },
  });
  expect(questions).toHaveLength(5);
  writeActiveGame({
    questions,
    settings,
    mode,
    seed,
    answers: [],
    elapsedMilliseconds: 0,
    questionCount: 5,
    contentVersion: catalog.contentVersion,
  });
  act(() => result.current.choose({ difficulty: 1, scope: 'gen-i' }));
  expect(startGame).toHaveBeenCalledOnce();
  expect(resume).toHaveBeenCalledOnce();
  expect(resume.mock.calls[0]![0].questions).toEqual(questions);
  const completed: GameResult = {
    answers: [],
    contentVersion: catalog.contentVersion,
    correctCount: 0,
    elapsedSeconds: 12,
    questionCount: 5,
    score: 0,
    dailyTrack: { difficulty: 3, scope: 'all' },
  };
  saveResult(mode, completed);
  act(() => result.current.choose({ difficulty: 5, scope: 'all' }));
  expect(startGame).toHaveBeenCalledOnce();
  expect(resume).toHaveBeenCalledOnce();
  expect(result.current.result).toMatchObject(completed);
  expect(result.current.savedState.attempts).toEqual({});
  unmount();
  localStorage.clear();
  writeActiveGame({
    questions,
    settings,
    mode,
    seed,
    answers: [],
    elapsedMilliseconds: 0,
    questionCount: 5,
    contentVersion: catalog.contentVersion,
  });
  saveResult(
    { kind: 'daily', date: '2026-09-12' },
    { ...completed, dailyTrack: undefined },
  );
  window.history.replaceState(null, '', '/?daily=2026-09-12&level=3&scope=all');
  const resumeLinked = vi.fn<(snapshot: ActiveGameSnapshot) => void>();
  const linked = renderHook(() =>
    useDailyChallenge({
      catalog,
      settings: defaultGameSettings,
      refreshSavedData: vi.fn(),
      startGame,
      resume: resumeLinked,
    }),
  );
  expect(linked.result.current.result).toBeNull();
  act(() => linked.result.current.start());
  expect(resumeLinked).toHaveBeenCalledOnce();
  linked.unmount();

  window.history.replaceState(null, '', '/');
  localStorage.clear();
  sessionStorage.clear();
});

it('does not generate retired tracks or unavailable versions', async () => {
  const { catalog } = await import('../../../tests/fixtures/catalog');
  for (const query of ['level=1&scope=gen-i', 'level=3&scope=all&rules=999']) {
    localStorage.clear();
    window.history.replaceState(null, '', `/?daily=2026-09-12&${query}`);
    const startGame = vi.fn<StartGame>();
    const { result, unmount } = renderHook(() =>
      useDailyChallenge({
        catalog,
        settings: defaultGameSettings,
        refreshSavedData: vi.fn(),
        startGame,
        resume: vi.fn(),
      }),
    );
    act(() => result.current.start());
    expect(startGame).not.toHaveBeenCalled();
    expect(result.current.error).toContain('no longer available');
    unmount();
  }
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

it('retains the original date-link and play-link entry behavior', () => {
  for (const [search, autoStart] of [
    ['?daily=2026-09-01', false],
    ['?daily=2026-09-01&play=1', true],
  ] as const) {
    window.history.replaceState(null, '', `/${search}`);
    const { result, unmount } = renderHook(() =>
      useDailyChallenge({
        settings: defaultGameSettings,
        refreshSavedData: vi.fn(),
        startGame: vi.fn(),
        resume: vi.fn(),
      }),
    );
    expect(result.current.autoStart).toBe(autoStart);
    unmount();
  }
  window.history.replaceState(null, '', '/');
});

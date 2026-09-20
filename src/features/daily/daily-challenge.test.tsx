import { act, renderHook } from '@testing-library/react';
import { resetLocalSave, saveResult } from '../../../tests/fixtures/local-save';
import type { StartGame } from '../../app/game-session';
import type { GameResult } from '../../domain/quiz/types';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import type { ActiveGameSnapshot } from '../../lib/storage/active-game-storage';
import { readDailyResult } from '../../lib/storage/results-storage';
import { useDailyChallenge } from './useDailyChallenge';

beforeEach(resetLocalSave);

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

it('does not show a previous Daily completion as the new day’s result', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-12T23:59:59.900Z'));
  window.history.replaceState(null, '', '/');
  const { result, unmount } = renderHook(() =>
    useDailyChallenge({
      settings: defaultGameSettings,
      refreshSavedData: vi.fn(),
      startGame: vi.fn(),
      resume: vi.fn(),
    }),
  );
  const recordCompletion = result.current.recordCompletion;
  const completed: GameResult = {
    answers: [],
    contentVersion: 1,
    correctCount: 0,
    elapsedSeconds: 10,
    questionCount: 5,
    score: 0,
  };
  vi.setSystemTime(new Date('2026-09-13T00:00:00.100Z'));
  act(() => {
    window.dispatchEvent(new Event('focus'));
  });
  await act(async () => {
    await saveResult({ kind: 'daily', date: '2026-09-12' }, completed);
    recordCompletion(completed, true, '2026-09-12');
  });
  expect(result.current.date).toBe('2026-09-13');
  expect(result.current.result).toBeNull();
  expect(result.current.resultSaved).toBe(false);
  expect(readDailyResult('2026-09-12')).toEqual(completed);
  unmount();
});

it.each([
  ['/', '2026-09-13'],
  ['/?daily=2026-09-12', '2026-09-12'],
])(
  'starts the correct Daily after midnight from %s',
  async (url, expectedDate) => {
    const { catalog } = await import('../../../tests/fixtures/catalog');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-12T23:59:59.900Z'));
    window.history.replaceState(null, '', url);
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
    expect(result.current.date).toBe('2026-09-12');
    vi.setSystemTime(new Date('2026-09-13T00:00:00.100Z'));
    await act(async () => {
      await result.current.start();
    });
    expect(startGame).toHaveBeenCalledOnce();
    expect(startGame.mock.calls[0]![2]).toMatchObject({
      kind: 'daily',
      date: expectedDate,
    });
    expect(result.current.date).toBe(expectedDate);
    unmount();
  },
);

it('keeps an unsaved completion visible and adopts a later saved result', async () => {
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

  act(() => result.current.recordCompletion(completed, false, '2026-09-01'));
  expect(result.current.result).toEqual(completed);
  expect(result.current.resultSaved).toBe(false);
  expect(readDailyResult('2026-09-01')).toBeNull();

  act(() => {
    window.dispatchEvent(new Event('focus'));
  });
  expect(result.current.result).toEqual(completed);
  expect(result.current.resultSaved).toBe(false);

  await saveResult({ kind: 'daily', date: '2026-09-01' }, completed);
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
  await act(async () => {
    await result.current.start();
  });
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
  await writeActiveGame({
    questions,
    settings,
    mode,
    seed,
    answers: [],
    elapsedMilliseconds: 0,
    questionCount: 5,
    contentVersion: catalog.contentVersion,
  });
  await act(async () => {
    await result.current.choose({ difficulty: 1, scope: 'gen-i' });
  });
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
  await saveResult(mode, completed);
  await act(async () => {
    await result.current.choose({ difficulty: 5, scope: 'all' });
  });
  expect(startGame).toHaveBeenCalledOnce();
  expect(resume).toHaveBeenCalledOnce();
  expect(result.current.result).toMatchObject(completed);
  expect(result.current.savedState.attempts).toEqual({});
  unmount();
  localStorage.clear();
  await resetLocalSave();
  await writeActiveGame({
    questions,
    settings,
    mode,
    seed,
    answers: [],
    elapsedMilliseconds: 0,
    questionCount: 5,
    contentVersion: catalog.contentVersion,
  });
  await saveResult(
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
  await act(async () => {
    await linked.result.current.start();
  });
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
    await act(async () => {
      await result.current.start();
    });
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

it.each([
  'screen=account',
  'screen=friends',
  'screen=leaderboards',
  'trainer=card',
  '#friend=abcd1234abcd1234',
])('does not auto-start a Daily behind the %s destination', (destination) => {
  const suffix = destination.startsWith('#') ? destination : `&${destination}`;
  window.history.replaceState(null, '', `/?daily=2026-09-01&play=1${suffix}`);
  const { result, unmount } = renderHook(() =>
    useDailyChallenge({
      settings: defaultGameSettings,
      refreshSavedData: vi.fn(),
      startGame: vi.fn(),
      resume: vi.fn(),
    }),
  );

  expect(result.current.autoStart).toBe(false);
  expect(result.current.date).toBe('2026-09-01');
  unmount();
});

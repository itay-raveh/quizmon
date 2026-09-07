import { act, renderHook } from '@testing-library/react';
import { useStopwatch } from '@/game/stopwatch';

let now = 0;

const advance = (milliseconds: number) => {
  act(() => {
    now += milliseconds;
    vi.advanceTimersByTime(milliseconds);
  });
};

beforeEach(() => {
  now = 0;
  vi.useFakeTimers();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it('preserves exact elapsed time across pauses and resumes', () => {
  const { result, unmount } = renderHook(() => useStopwatch());
  act(() => result.current.start());
  advance(250);
  expect(result.current.elapsedMilliseconds).toBe(250);
  expect(result.current.elapsedSeconds).toBe(0);

  now = 375;
  expect(result.current.getElapsedMilliseconds()).toBe(375);
  act(() => {
    expect(result.current.pause()).toBe(375);
  });
  advance(1_000);
  expect(result.current.elapsedMilliseconds).toBe(375);
  expect(result.current.getElapsedMilliseconds()).toBe(375);
  act(() => {
    expect(result.current.pause()).toBe(375);
    result.current.start();
  });
  advance(875);
  expect(result.current.elapsedMilliseconds).toBe(1_250);
  expect(result.current.elapsedSeconds).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('restores a fractional elapsed time and stops ticking on reset', () => {
  const { result, unmount } = renderHook(() => useStopwatch());
  act(() => result.current.reset(1_234.5));
  expect(result.current.elapsedMilliseconds).toBe(1_234.5);
  expect(result.current.elapsedSeconds).toBe(1);
  expect(result.current.getElapsedMilliseconds()).toBe(1_234.5);
  act(() => result.current.start());
  advance(1_000);
  expect(result.current.elapsedMilliseconds).toBe(2_234.5);
  expect(result.current.elapsedSeconds).toBe(2);
  act(() => result.current.reset(-10));
  advance(1_000);
  expect(result.current.elapsedMilliseconds).toBe(0);
  expect(result.current.elapsedSeconds).toBe(0);
  expect(result.current.getElapsedMilliseconds()).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
  unmount();
});

it('changes display cadence without restarting the running clock', () => {
  const { result, rerender, unmount } = renderHook(
    ({ milliseconds }) => useStopwatch(milliseconds),
    { initialProps: { milliseconds: false } },
  );
  act(() => result.current.start());
  advance(50);
  expect(result.current.elapsedMilliseconds).toBe(0);
  rerender({ milliseconds: true });
  expect(result.current.elapsedMilliseconds).toBe(50);
  advance(50);
  expect(result.current.elapsedMilliseconds).toBe(100);
  rerender({ milliseconds: false });
  advance(50);
  expect(result.current.elapsedMilliseconds).toBe(100);
  expect(result.current.getElapsedMilliseconds()).toBe(150);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

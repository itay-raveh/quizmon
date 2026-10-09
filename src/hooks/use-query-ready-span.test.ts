import { beforeEach, expect, test, vi } from 'vitest';
import { useQueryReadySpan } from './use-query-ready-span';

const harness = vi.hoisted(() => ({
  ref: { current: null },
  effects: [] as (() => void)[],
  span: { end: vi.fn(), setStatus: vi.fn() },
  start: vi.fn(),
}));
vi.mock('react', () => ({
  useRef: () => harness.ref,
  useLayoutEffect: (effect: () => void) => harness.effects.push(effect),
  useEffect: () => {},
}));
vi.mock('../lib/sentry', () => ({
  Sentry: { startInactiveSpan: harness.start },
}));
beforeEach(() => {
  vi.clearAllMocks();
  harness.ref.current = null;
  harness.effects = [];
  harness.start.mockReturnValue(harness.span);
});
const Render = (ready: boolean, failed = false) => {
  useQueryReadySpan(
    'trainer.ready',
    'private-owner/private-trainer',
    true,
    ready,
    failed,
    false,
  );
  harness.effects.splice(0).forEach((effect) => effect());
};
test('readiness waits for content, finishes once, and never sends the query identity', () => {
  Render(false);
  expect(harness.span.end).not.toHaveBeenCalled();
  Render(true);
  Render(true);
  expect(harness.start).toHaveBeenCalledTimes(1);
  expect(harness.span.end).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(harness.start.mock.calls)).not.toContain('private-');
});
test('a failed load finishes the readiness span instead of leaving it open', () => {
  Render(false);
  Render(false, true);
  expect(harness.span.setStatus).toHaveBeenCalledWith({
    code: 2,
    message: 'error',
  });
  expect(harness.span.end).toHaveBeenCalledTimes(1);
});

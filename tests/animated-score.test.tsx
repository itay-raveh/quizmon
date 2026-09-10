import { act, render, screen } from '@testing-library/react';
import { AnimatedScore } from '@/components/AnimatedScore';
import { MotionProvider } from '@/components/MotionProvider';

afterEach(() => vi.unstubAllGlobals());

describe('AnimatedScore', () => {
  it('shows the final score immediately when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    const playSound = vi.fn();
    render(
      <MotionProvider reduceMotion={false}>
        <AnimatedScore playSound={playSound} format={String} value={750} />
      </MotionProvider>,
    );
    expect(screen.getByText('750')).toBeInTheDocument();
    expect(playSound).not.toHaveBeenCalled();
  });
});

it('follows playback rather than elapsed time, including a delayed audio start', () => {
  let nextFrame: FrameRequestCallback = () => undefined;
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const playback = { progress: vi.fn(() => 0), stop: vi.fn() };
  const playSound = vi.fn(() => playback);
  const view = render(
    <AnimatedScore playSound={playSound} format={String} value={1000} />,
  );
  act(() => nextFrame(performance.now() + 5000));
  expect(screen.getByText('0')).toBeInTheDocument();
  playback.progress.mockReturnValue(0.5);
  act(() => nextFrame(performance.now() + 6000));
  expect(screen.getByText('500')).toBeInTheDocument();
  playback.progress.mockReturnValue(0.9999);
  act(() => nextFrame(performance.now() + 7000));
  expect(screen.getByText('999')).toBeInTheDocument();
  expect(playback.stop).not.toHaveBeenCalled();
  playback.progress.mockReturnValue(1);
  act(() => nextFrame(performance.now() + 8000));
  expect(screen.getByText('1000')).toBeInTheDocument();
  expect(playback.stop).toHaveBeenCalledOnce();
  expect(playSound).toHaveBeenCalledOnce();
  view.unmount();
});
